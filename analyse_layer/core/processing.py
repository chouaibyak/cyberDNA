from .normalizer import LogNormalizer
from .extractor import FeatureExtractor
from .detector import SentinelML, ThreatDetector
from .mitre_analyzer import MitreAnalyzer
from services.elastic_service import get_recent_logs, es 
from services.websocket_manager import ws_manager
from datetime import datetime
from .correlation import BruteForceCorrelator

# Instances globales
normalizer = LogNormalizer()
extractor = FeatureExtractor()
ml_engine = SentinelML(contamination=0.1)
threat_detector = ThreatDetector()
mitre_analyzer = MitreAnalyzer()
brute_force_correlator = BruteForceCorrelator(window_seconds=300, threshold=5)

# MÉMOIRE POUR ÉVITER LE SPAM (DÉDOUBLONNAGE). Les campagnes stockent aussi
# l'identifiant Elasticsearch pour que leurs preuves puissent être enrichies.
sent_alerts = {}

async def process_log_for_ml(raw_log):
    # 1. Normalisation
    norm = normalizer.normalize(raw_log)
    if not norm:
        return

    # Vérification de l'IP source
    if not norm.get("source_ip"):
        return 

    # Corrélation prioritaire : une tentative Hydra reste un log archivé, mais
    # plusieurs échecs liés deviennent une seule campagne T1110.
    campaign = brute_force_correlator.observe(norm)
    if campaign and campaign["is_brute_force"]:
        campaign_key = campaign["campaign_id"]
        mitre_info = mitre_analyzer.get_technique_info("T1110")
        raw_log["analysis"] = {
            "status": "campaign_member",
            "campaign_id": campaign_key,
            "ml": {"is_alert": True, "risk_score": campaign["risk_score"], "status": "ATTACK"},
            "mitre_attack": mitre_info,
        }

        # The first threshold crossing creates and broadcasts the only alert.
        # Subsequent Hydra attempts update its evidence instead of creating rows.
        if campaign_key in sent_alerts:
            alert_id = sent_alerts[campaign_key]
            if alert_id == "pending":
                return raw_log["analysis"]
            try:
                await es.update(
                    index="security-alerts", id=alert_id,
                    doc={"risk_score": campaign["risk_score"], "severity": "HIGH",
                         "evidence": {"event_count": campaign["event_count"]},
                         "mitre_analysis": {"description": f"Campagne de force brute : {campaign['event_count']} tentatives regroupées sur 5 minutes."}},
                )
            except Exception as e:
                print(f"[ES ERROR] Mise à jour campagne {campaign_key}: {e}")
            return raw_log["analysis"]

        alert_document = {
            "@timestamp": norm["timestamp"], "campaign_id": campaign_key,
            "source_ip": norm["source_ip"], "honeypot": norm["honeypot"],
            "risk_score": campaign["risk_score"], "severity": "HIGH",
            "mitre_analysis": {
                "technique_id": mitre_info["id"], "technique_name": mitre_info["name"],
                "tactic": mitre_info["tactic"],
                "description": f"Campagne de force brute : {campaign['event_count']} tentatives regroupées sur 5 minutes.",
                "advice": mitre_info["advice"],
            },
            "evidence": {"event_count": campaign["event_count"], "protocol": norm["protocol"],
                         "port": norm["dst_port"], "campaign_window_seconds": 300,
                         "classification": "Hydra-like SSH brute force"},
        }
        # Reserve the campaign before the Elasticsearch await: concurrent log
        # ingestion cannot create a second dashboard alert for the same attack.
        sent_alerts[campaign_key] = "pending"
        try:
            res = await es.index(index="security-alerts", document=alert_document)
            es_id = res.get("_id", "unknown")
        except Exception as e:
            print(f"[ES ERROR] {e}")
            es_id = "unknown"
        sent_alerts[campaign_key] = es_id
        await ws_manager.broadcast({
            "id": f"#{int(datetime.now().timestamp()) % 10000}", "es_id": es_id,
            "time": datetime.now().strftime("%H:%M:%S"), "ip": norm["source_ip"],
            "pot": norm["honeypot"].capitalize(), "event": mitre_info["name"],
            "status": "ATTACK", "score": campaign["risk_score"] / 100.0, "tactic": mitre_info["tactic"],
            "full_details": {"es_index": "security-alerts", "campaign_id": campaign_key,
                             "event_count": campaign["event_count"],
                             "ml_confidence": f"{campaign['risk_score']}%", "mitre_id": "T1110",
                             "advice": mitre_info["advice"]},
        })
        return raw_log["analysis"]

    # 2. Historique et Features (Fenêtre de 5 minutes)
    # MODIFICATION : On récupère les logs et on les normalise en une seule ligne (plus rapide)
    historical_raw_logs = await get_recent_logs(minutes=5)
    normalized_history = [normalizer.normalize(raw) for raw in historical_raw_logs if normalizer.normalize(raw)]
    normalized_history.append(norm)

    all_features = extractor.extract_features(normalized_history)

    # 3. Diagnostic IA (Isolation Forest + Heuristique)
    ml_verdicts = ml_engine.predict_anomalies(all_features)

    # 4. Traitement des résultats
    target_ip = norm["source_ip"]
    ts_current = extractor._parse_timestamp(norm["timestamp"])
    current_win_id = int(ts_current.timestamp() / 300) 
    current_key = f"{target_ip}_{current_win_id}"

    if current_key in all_features:
        # Verdict de l'IA (L'objet v contient is_alert et risk_score)
        v = threat_detector.detect(norm, all_features[current_key], ml_verdicts.get(current_key))
        
        # CONDITION : IA détecte anomalie ET score > 70
        if v["is_alert"] and v["risk_score"] > 70:
            
            # --- DÉDOUBLONNAGE ---
            if current_key in sent_alerts:
                # On retourne l'analyse même si on n'envoie pas d'alerte pour garder une trace en base
                raw_log["analysis"] = {"ml": v, "status": "already_alerted"}
                return raw_log["analysis"]

            print(f"!!! NOUVELLE MENACE DÉTECTÉE !!! IP: {target_ip} | Score: {v['risk_score']}%")

            # --- ANALYSE DE FENÊTRE POUR MITRE ---
            # On récupère TOUS les logs de l'IP dans la fenêtre actuelle
            logs_in_this_window = [
                l for l in normalized_history 
                if l["source_ip"] == target_ip and int(extractor._parse_timestamp(l["timestamp"]).timestamp() / 300) == current_win_id
            ]
            
            # MODIFICATION : Appel à la méthode comportementale (logs + stats)
            mitre_info = mitre_analyzer.map_window_to_mitre(
                logs_in_this_window, 
                all_features[current_key]
            )
            
            sent_alerts[current_key] = "anomaly"

            # Mise à jour du log original
            raw_log["analysis"] = {"ml": v, "features": all_features[current_key]}
            if mitre_info:
                raw_log["analysis"]["mitre_attack"] = mitre_info

            # Construction du document d'alerte pour Elasticsearch
            alert_document = {
                "@timestamp": norm["timestamp"],
                "source_ip": target_ip,
                "honeypot": norm["honeypot"],
                "risk_score": v["risk_score"],
                "severity": "CRITICAL" if v["risk_score"] > 85 else "HIGH",
                "mitre_analysis": {
                    "technique_id": mitre_info['id'] if mitre_info else "T0000",
                    "technique_name": mitre_info['name'] if mitre_info else "Anomalie IA",
                    "tactic": mitre_info['tactic'] if mitre_info else "Execution",
                    "description": f"Analyse comportementale sur {len(logs_in_this_window)} événements.",
                    "advice": mitre_info['advice'] if mitre_info else "Investiguer l'IP source"
                },
                "evidence": {
                    "event_count": len(logs_in_this_window),
                    "command": norm["extra_info"].get("input") or "N/A",
                    "protocol": norm["protocol"],
                    "port": norm["dst_port"],
                    "file_hash": norm["extra_info"].get("file_hash") or "N/A"
                }
            }

            # Envoi Elasticsearch
            try:
                res = await es.index(index="security-alerts", document=alert_document)
                es_id = res.get("_id", "unknown")
            except Exception as e:
                print(f"[ES ERROR] {e}")
                es_id = "unknown"

            # Envoi Dashboard (WebSocket)
            ui_alert = {
                "id": f"#{int(datetime.now().timestamp()) % 10000}",
                "es_id": es_id,
                "time": datetime.now().strftime("%H:%M:%S"),
                "ip": target_ip,
                "pot": norm["honeypot"].capitalize(),
                "event": mitre_info['name'] if mitre_info else "Anomalie IA",
                "status": "ATTACK",
                "score": v["risk_score"] / 100.0,
                "tactic": mitre_info['tactic'] if mitre_info else "Initial Access",
                "full_details": {
                    "es_index": "security-alerts",
                    "event_count": len(logs_in_this_window),
                    "ml_confidence": f"{v['risk_score']}%",
                    "mitre_id": mitre_info['id'] if mitre_info else "T0000",
                    "advice": mitre_info['advice'] if mitre_info else "Investiguer la source"
                }
            }
            await ws_manager.broadcast(ui_alert)

        else:
            # On enregistre quand même le verdict "NORMAL" dans le log sans envoyer d'alerte
            raw_log["analysis"] = {"ml": v, "status": "normal"}
            
        return raw_log.get("analysis", {"status": "ignored"})
