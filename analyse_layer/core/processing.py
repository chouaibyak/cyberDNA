from .normalizer import LogNormalizer
from .extractor import FeatureExtractor
from .detector import SentinelML, ThreatDetector
from .mitre_analyzer import MitreAnalyzer
# On importe 'es' en plus pour pouvoir indexer les alertes
from services.elastic_service import get_recent_logs, es 
from services.websocket_manager import ws_manager
from datetime import datetime

# Instances globales
normalizer = LogNormalizer()
extractor = FeatureExtractor()
ml_engine = SentinelML(contamination=0.1)
threat_detector = ThreatDetector()
mitre_analyzer = MitreAnalyzer()

async def process_log_for_ml(raw_log):
    # 1. Normalisation du log actuel
    norm = normalizer.normalize(raw_log)
    if not norm:
        return

    # 2. RÉSOLUTION DU PROBLÈME DE MÉMOIRE
    historical_raw_logs = await get_recent_logs(limit=500)
    
    normalized_history = []
    for raw in historical_raw_logs:
        n = normalizer.normalize(raw)
        if n: normalized_history.append(n)
    
    normalized_history.append(norm)

    # 3. Extraction des features sur l'historique complet
    all_features = extractor.extract_features(normalized_history)

    # 4. Diagnostic IA
    ml_verdicts = ml_engine.predict_anomalies(all_features)

    # 5. Traitement des résultats
    target_ip = norm["source_ip"]
    # --- MODIFICATION POUR FENÊTRAGE ---
    # On calcule l'ID de la fenêtre du log actuel pour retrouver ses statistiques
    ts_current = extractor._parse_timestamp(norm["timestamp"])
    current_win_id = int(ts_current.timestamp() / 60) # 60 pour 1 minute
    current_key = f"{target_ip}_{current_win_id}"

    print(f"--- ANALYSE FENÊTRE ---")
    print(f"Clé : {current_key} | IP: {target_ip} | WindowID: {current_win_id}")


    if current_key in all_features:
        # On passe 'all_features[current_key]' au lieu de 'all_features[target_ip]'
        v = threat_detector.detect(norm, all_features[current_key], ml_verdicts.get(current_key))
        
        # On met à jour le log avec les stats de la fenêtre actuelle
        raw_log["analysis"] = {"ml": v, "features": all_features[current_key]}

        # Enrichissement avec MITRE ATT&CK
        mitre_info = mitre_analyzer.map_log_to_mitre(norm)
        if mitre_info:
            raw_log["analysis"]["mitre_attack"] = mitre_info

        # --- RESTE DU CODE (ALERTES) ---
        is_critical = mitre_info and mitre_info['id'] in ["T1486", "T1110", "T1210"]
                
        if v["is_alert"] or is_critical:

            # 1. Construction du document d'alerte ultra-complet (CyberDNA)
            alert_document = {
                "@timestamp": norm["timestamp"],
                "source_ip": target_ip,
                "honeypot": norm["honeypot"],
                "risk_score": v["risk_score"],
                "severity": "CRITICAL" if v["risk_score"] > 80 or is_critical else "HIGH",
                
                # Tous les détails MITRE demandés
                "mitre_analysis": {
                    "technique_id": mitre_info['id'] if mitre_info else "T0000",
                    "technique_name": mitre_info['name'] if mitre_info else "Anomalie IA",
                    "tactic": mitre_info['tactic'] if mitre_info else "Execution",
                    "description": mitre_info['description'] if mitre_info else "Détecté par Isolation Forest",
                    "advice": mitre_info['advice'] if mitre_info else "Investiguer l'IP source"
                },
                
                # Preuves techniques (Evidence)
                "evidence": {
                    "command": norm["extra_info"].get("input") or "N/A",
                    "protocol": norm["protocol"],
                    "port": norm["dst_port"],
                    "file_hash": norm["extra_info"].get("file_hash") or "N/A"
                }
            }

            # Envoi vers Elasticsearch dans l'index dédié pour obtenir le es_id réel
            es_id = "unknown"
            try:
                res = await es.index(index="security-alerts", document=alert_document)
                es_id = res.get("_id", "unknown")
                print(f"[ES] Alerte qualifiée enregistrée dans 'security-alerts' pour {target_ip} (ID: {es_id})")
            except Exception as e:
                print(f"[ES ERROR] Erreur lors de l'indexation de l'alerte : {e}")

            # 2. On prépare l'objet JSON exactement comme ton Dashboard l'attend
            ui_alert = {
                "id": f"#{int(datetime.now().timestamp()) % 10000}", # ID court pour le design
                "es_id": es_id,
                "time": datetime.now().strftime("%H:%M:%S"),
                "ip": target_ip,
                "pot": norm["honeypot"].capitalize(),
                "event": mitre_info['name'] if mitre_info else "Anomalie IA",
                "score": v["risk_score"] / 100.0, # Pour le ScoreBadge (0.0 à 1.0)
                "tactic": mitre_info['tactic'] if mitre_info else "Initial Access",
                "full_details": {
                    "es_index": "security-alerts",
                    "ml_confidence": f"{v['risk_score']}%",
                    "mitre_id": mitre_info['id'] if mitre_info else "T0000",
                    "advice": mitre_info['advice'] if mitre_info else "Investiguer la source"
                }
            }

            # 3. ENVOI AU DASHBOARD (Temps Réel)
            await ws_manager.broadcast(ui_alert)

        # --- AFFICHAGE CONSOLE (DEBUG) ---
        if v["is_alert"]:
            print(f"\n[!!! ALERTE SÉCURITÉ !!!]")
            print(f"IP Attaquante : {target_ip}")
            if mitre_info:
                print(f"Type d'Attaque : {mitre_info['name']}")
                print(f"Phase (Tactique) : {mitre_info['tactic']}")
                print(f"Conseil : {mitre_info['advice']}")
            print(f"Score de risque : {v['risk_score']}/100")
            
        return raw_log["analysis"]