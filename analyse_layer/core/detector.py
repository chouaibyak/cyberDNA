import numpy as np
import json
import os
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class SentinelML:
    def __init__(self, contamination=0.05):
        self.model = IsolationForest(contamination=contamination, random_state=42)
        self.scaler = StandardScaler()
        # Chargement d'un profil "Normal" pré-défini
        self.baseline = self._load_baseline()

    def _load_baseline(self):
        # On définit mathématiquement ce qu'est un utilisateur "Sain"
        # [events, ports, logins, danger, protos, eps, iat]
        return np.array([
            [2, 1, 0, 1, 1, 0.1, 10.0],
            [5, 1, 1, 2, 1, 0.5, 5.0],
            [1, 1, 0, 0, 1, 0.01, 20.0]
        ])

    def predict_anomalies(self, features_by_ip):
        ips = list(features_by_ip.keys())
        if not ips: return {}

        # 1. Préparation des données Live
        X_live = []
        for ip in ips:
            f = features_by_ip[ip]
            X_live.append([f["total_events"], f["unique_ports"], f["login_attempts"], 
                           f["danger_score"], f["unique_protocols"], f["eps"], f["iat"]])
        
        X_live = np.array(X_live)
        
        # 2. Fusion Baseline + Live pour créer le contexte
        # L'IA apprend la différence entre la norme et le trafic actuel
        X_combined = np.vstack([self.baseline, X_live])
        X_scaled = self.scaler.fit_transform(X_combined)
        
        self.model.fit(X_scaled)
        all_predictions = self.model.predict(X_scaled)
        all_scores = self.model.decision_function(X_scaled)

        # On ne garde que les résultats pour les IPs Live (on ignore la baseline)
        live_predictions = all_predictions[len(self.baseline):]
        live_scores = all_scores[len(self.baseline):]

        results = {}
        for i, ip in enumerate(ips):
            # Calcul du score de risque (Inverser le score de decision_function)
            risk_score = round(abs(live_scores[i]) * 100, 2)
            is_anomaly = (live_predictions[i] == -1)

            # --- COUCHE HEURISTIQUE (Le filet de sécurité) ---
            # Volume anormal ou charge RCE/WebShell : la signature forte
            # déclenche l'alerte sans attendre que le modèle statistique réagisse.
            if (features_by_ip[ip]["login_attempts"] > 15
                    or features_by_ip[ip]["eps"] > 20
                    or features_by_ip[ip]["danger_score"] >= 80):
                is_anomaly = True
                risk_score = max(risk_score, 95.0)

            results[ip] = {
                "is_alert": is_anomaly,
                "risk_score": risk_score,
                "status": "ATTACK" if is_anomaly else "NORMAL"
            }
        return results
    
class ThreatDetector:
    def detect(self, log, features, ml_verdict):
        """Retourne uniquement le verdict du détecteur d'anomalies ML."""
        # On vérifie si ml_verdict existe et s'il ne contient pas une erreur
        if ml_verdict and "is_alert" in ml_verdict and ml_verdict["is_alert"]:
            return {
                "is_alert": True,
                "risk_score": ml_verdict["risk_score"],
                "status": ml_verdict["status"],
                "reasons": ["anomalie statistique (Isolation Forest)"],
            }

        return {
            "is_alert": False,
            "risk_score": ml_verdict["risk_score"] if (ml_verdict and "risk_score" in ml_verdict) else 0.0,
            "status": "NORMAL",
            "reasons": [],
        }
