import json
import os
import re
from pathlib import Path

class MitreAnalyzer:
    def __init__(self):
        data_path = Path(os.getenv("MITRE_ATTACK_DATA", "/app/data/enterprise-attack.json"))
        self.techniques = self._load_official_catalog(data_path)

        self.COMMAND_PATTERNS = {
            "T1486": re.compile(r"(encrypt|crypt|decrypt|ransom|pay|btc|bitcoin|locked|recovery|README_RECOVERY)", re.I),
            "T1087": re.compile(r"\b(whoami|id|getent|useradd|groupadd)\b|cat.*/etc/(passwd|shadow|group)", re.I),
            "T1082": re.compile(r"\b(uname|hostname|uptime|dmesg)\b|cat.*/proc/(cpuinfo|meminfo|version)", re.I),
            "T1016": re.compile(r"\b(ifconfig|ip\s+addr|netstat|route|arp|nmcli|ufw|iptables)\b", re.I),
            "T1083": re.compile(r"\b(ls|find|locate|pwd|tree|du|df)\b\s+.*", re.I),
            "T1057": re.compile(r"\b(ps|top|htop|pgrep|pkill)\b", re.I),
            "T1059": re.compile(r"\b(python\d?|perl|ruby|lua|node|bash|sh|zsh)\b", re.I),
            "T1203": re.compile(r"\b(gcc|make|g\+\+|clang|cc)\b|./configure", re.I),
            "T1543": re.compile(r"\b(systemctl|service)\b|/etc/rc\.local|cron(\.d)?", re.I),
            "T1098": re.compile(r"authorized_keys|\.ssh/id_.*|ssh-keygen", re.I),
            "T1548": re.compile(r"\b(sudo|su\s+-|pkexec|visudo)\b|chmod\s+([421]777|\+s)", re.I),
            "T1070": re.compile(r"\b(history\s+-c|clear)\b|HISTFILE|rm\s+.*(\.log|history)", re.I),
            "T1140": re.compile(r"\b(base64|openssl|gpg)\b.*\s+(-d|--decode|decrypt)", re.I),
            "T1552": re.compile(r"cat.*\.(bash|mysql)_history|env|printenv", re.I),
            "T1105": re.compile(r"\b(wget|curl|tftp|scp|rsync|nc|netcat|ncat|socat)\b", re.I),
            "T1485": re.compile(r"rm\s+-rf\s+/|mkfs|shred|dd\s+if=/dev/zero", re.I),
            "T1496": re.compile(r"\b(minerd|xmrig|cpuminer|cryptonight)\b", re.I),
        }
        
        self.GENERIC_PORT_MAP = {
            21: "T1110", 22: "T1110", 23: "T1110", 25: "T1566",
            53: "T1568", 80: "T1190", 443: "T1190", 445: "T1210",
            1433: "T1190", 3306: "T1190", 3389: "T1110", 5900: "T1021.005",
        }
        self.DB_ATTACK_PATTERNS = {
            "T1190": re.compile(r"\b(union\s+select|select\s+.*\s+from|sleep\s*\(|benchmark\s*\()", re.I),
            "T1505.001": re.compile(r"\b(xp_cmdshell|into\s+outfile|load_file\s*\()", re.I),
        }
        self.WEB_SHELL_PATTERN = re.compile(
            r"<\?php|\b(system|shell_exec|passthru|exec|eval|assert|base64_decode)\s*\(", re.I
        )

    @staticmethod
    def _format_tactic(tactic):
        return tactic.replace("-", " ").title() if tactic else "Inconnu"

    def _load_official_catalog(self, data_path):
        if not data_path.is_file():
            raise RuntimeError(f"Catalogue ATT&CK introuvable : {data_path}")
        with data_path.open(encoding="utf-8") as catalog_file:
            objects = json.load(catalog_file)["objects"]
        mitigation_names = {item["id"]: item["name"] for item in objects if item.get("type") == "course-of-action"}
        mitigations_by_technique = {}
        for item in objects:
            if item.get("type") == "relationship" and item.get("relationship_type") == "mitigates":
                mitigations_by_technique.setdefault(item["target_ref"], []).append(mitigation_names.get(item["source_ref"]))
        techniques = {}
        for item in objects:
            if item.get("type") != "attack-pattern" or item.get("revoked") or item.get("x_mitre_deprecated"): continue
            attack_id = next((ref.get("external_id") for ref in item.get("external_references", []) if ref.get("source_name") == "mitre-attack" and ref.get("external_id", "").startswith("T")), None)
            if not attack_id: continue
            tactics = [self._format_tactic(phase.get("phase_name")) for phase in item.get("kill_chain_phases", []) if phase.get("kill_chain_name") == "mitre-attack"]
            mitigation = next((name for name in mitigations_by_technique.get(item["id"], []) if name), "Surveiller et contenir la source.")
            techniques[attack_id] = {"id": attack_id, "name": item["name"], "tactic": tactics[0] if tactics else "Inconnu", "description": item.get("description") or "N/A", "advice": mitigation}
        return techniques

    def get_technique_info(self, technique_id):
        return self.techniques.get(technique_id)

    def clean_command(self, cmd):
        if not cmd: return ""
        return cmd.replace("''", "").replace('""', "")

    def map_log_to_mitre(self, normalized_log):
        extra = normalized_log.get("extra_info", {})
        port = normalized_log.get("dst_port")
        try: port = int(port) if port is not None else None
        except: port = None
        tech_id = None

        for val in extra.values():
            if isinstance(val, str) and self.COMMAND_PATTERNS["T1486"].search(self.clean_command(val)):
                return self.get_technique_info("T1486")

        if normalized_log["honeypot"] == "cowrie":
            if "password" in extra or normalized_log.get("event_type") == "cowrie.login.failed":
                tech_id = "T1110"
            elif "input" in extra:
                clean_cmd = self.clean_command(extra["input"])
                for tid, pattern in self.COMMAND_PATTERNS.items():
                    if pattern.search(clean_cmd):
                        tech_id = tid
                        break
                if not tech_id: tech_id = "T1059"

        elif normalized_log["honeypot"] == "honeytrap":
            # Honeytrap keeps HTTP request bodies in `payload` (and older
            # versions may use `body`). A PHP/RCE payload is a Web Shell.
            web_content = " ".join(str(extra.get(field, "")) for field in ("payload", "body", "http.url"))
            if self.WEB_SHELL_PATTERN.search(web_content):
                tech_id = "T1505.003"

        elif normalized_log["honeypot"] == "dionaea":
            if "file_hash" in extra: tech_id = "T1547"
            elif port == 445: tech_id = "T1078" if "credentials" in extra else "T1210"
            elif port in [1433, 3306]:
                sql_query = str(extra.get("query", "") or extra.get("sql", ""))
                for tid, pattern in self.DB_ATTACK_PATTERNS.items():
                    if pattern.search(sql_query):
                        tech_id = tid
                        break
                tech_id = tech_id or ("T1110" if "credentials" in extra else "T1190")

        if not tech_id:
            tech_id = self.GENERIC_PORT_MAP.get(port, "T1046")

        return self.get_technique_info(tech_id)

    # --- LA MÉTHODE MANQUANTE QUI CAUSAIT L'ERREUR ---
    def map_window_to_mitre(self, logs_in_window, window_features):
        """
        Analyse l'ensemble de la fenêtre et priorise le comportement (stats)
        sur la signature d'un seul log.
        """
        if not logs_in_window:
            return None

        # 1. PRIORITÉ COMPORTEMENTALE : Brute Force
        # Si on a plus de 5 tentatives de login dans la fenêtre, c'est un Brute Force
        if window_features.get("login_attempts", 0) >= 5:
            return self.get_technique_info("T1110")

        # 2. ANALYSE PAR SIGNATURE (si pas de brute force évident)
        tech_counts = {}
        for log in logs_in_window:
            info = self.map_log_to_mitre(log)
            if info:
                tid = info['id']
                tech_counts[tid] = tech_counts.get(tid, 0) + 1

        if not tech_counts:
            return None

        # Priorité aux techniques critiques (Ransomware, etc.)
        strong_techniques = ["T1486", "T1505.003", "T1210", "T1548"]
        for st in strong_techniques:
            if st in tech_counts:
                return self.get_technique_info(st)

        # Sinon, on prend la technique la plus fréquente dans la fenêtre
        most_frequent_id = max(tech_counts, key=tech_counts.get)
        return self.get_technique_info(most_frequent_id)
