import numpy as np
import json
import os
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class SentinelML:
    FEATURE_COUNT = 7

    def __init__(self, contamination=0.05, baseline_path=None):
        self.model = IsolationForest(contamination=contamination, random_state=42)
        self.scaler = StandardScaler()
        self.baseline_path = baseline_path or os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "processed", "baseline.csv"
        )
        self.baseline = self._load_baseline()
        # La norme est apprise une seule fois. Le trafic live ne doit jamais
        # modifier le scaler ni contaminer les données d'entraînement.
        baseline_scaled = self.scaler.fit_transform(self.baseline)
        self.model.fit(baseline_scaled)

    def _load_baseline(self):
        if not os.path.isfile(self.baseline_path):
            raise FileNotFoundError(
                f"Baseline ML introuvable : {self.baseline_path}. "
                "Exécutez scripts/create_baseline.py avant de démarrer l'API."
            )
        try:
            baseline = np.loadtxt(self.baseline_path, delimiter=",", ndmin=2)
        except (OSError, ValueError) as exc:
            raise ValueError(f"Baseline ML illisible : {self.baseline_path}") from exc

        if baseline.shape[1] != self.FEATURE_COUNT:
            raise ValueError(
                f"Baseline invalide : {baseline.shape[1]} colonnes, "
                f"{self.FEATURE_COUNT} attendues"
            )
        if baseline.shape[0] < 100 or not np.isfinite(baseline).all():
            raise ValueError("Baseline invalide ou insuffisante (minimum 100 lignes finies)")
        return baseline

    def predict_anomalies(self, features_by_ip):
        ips = list(features_by_ip.keys())
        if not ips: return {}

        # 1. Préparation des données Live
        X_live = []
        for ip in ips:
            f = features_by_ip[ip]
            X_live.append([f["total_events"], f["unique_ports"], f["login_attempts"], 
                           f["danger_score"], f["unique_protocols"], f["eps"], f["iat"]])
        
        X_live = np.asarray(X_live, dtype=float)
        if not np.isfinite(X_live).all():
            raise ValueError("Les features live contiennent NaN ou une valeur infinie")

        # Le scaler et le modèle restent ceux appris exclusivement sur la baseline.
        X_scaled = self.scaler.transform(X_live)
        live_predictions = self.model.predict(X_scaled)
        live_scores = self.model.decision_function(X_scaled)

        results = {}
        for i, ip in enumerate(ips):
            is_anomaly = (live_predictions[i] == -1)
            decision = float(live_scores[i])
            # decision_function=0 est la frontière. Une anomalie commence à 70,
            # afin de rester cohérente avec le seuil d'alerte de processing.py.
            if is_anomaly:
                risk_score = round(min(99.0, 70.01 + abs(decision) * 100), 2)
            else:
                risk_score = round(max(0.0, 50.0 - decision * 100), 2)

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
