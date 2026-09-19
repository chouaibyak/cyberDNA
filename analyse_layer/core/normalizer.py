from datetime import datetime, timezone


class LogNormalizer:
    def __init__(self):
        self.mappings = {
            "cowrie": {"source_ip": ("src_ip",), "dst_port": ("dst_port",), "protocol": ("protocol",), "event_type": ("eventid",)},
            # Dionaea connection incidents use the nested connection object,
            # while its download/login incidents expose fields at the root.
            "dionaea": {
                "source_ip": ("src_ip", "connection.src_ip"),
                "dst_port": ("dst_port", "connection.dst_port"),
                "protocol": ("connection.protocol", "protocol"),
                "event_type": ("connection.type", "type", "incident"),
            },
            # Honeytrap keys are normally flattened with hyphens, but accept
            # nested/dotted variants so upgrades do not silently drop data.
            "honeytrap": {
                "source_ip": ("source-ip", "source.ip", "src_ip"),
                "dst_port": ("destination-port", "destination.port", "dst_port"),
                "protocol": ("category", "protocol"),
                "event_type": ("type", "event_type"),
            },
        }
        self.whitelists = {
            "cowrie": ["username", "password", "input", "session", "hassh"],
            "dionaea": ["credentials", "transport", "src_port"],
            "honeytrap": ["http.url", "http.method", "http.header.user-agent", "token", "body", "payload"]
        }
        # Les versions/intégrations des honeypots n'utilisent pas toutes le
        # même nom pour le hash d'un fichier capturé.
        self.file_hash_mappings = {
            "dionaea": (
                ("file_hash", "unknown"), ("sha256", "sha256"),
                ("sha256_hash", "sha256"), ("sha512", "sha512"),
                ("sha512_hash", "sha512"), ("md5", "md5"),
                ("md5_hash", "md5"),
            ),
        }

    def _get_nested_value(self, data, key_path):
        # Honeytrap utilise des clés aplaties (ex. "http.url"), tandis que
        # Dionaea expose des objets imbriqués (ex. connection.protocol).
        if key_path in data:
            return data[key_path]

        keys = key_path.split('.')
        for k in keys:
            if isinstance(data, dict): data = data.get(k)
            else: return None
        return data

    def _first_value(self, data, paths):
        for path in paths:
            value = self._get_nested_value(data, path)
            if value is not None:
                return value
        return None

    def normalize(self, raw_log):
        source = raw_log.get("honeypot_source", "unknown")
        if source not in self.mappings: return None
        mapping = self.mappings[source]
        whitelist = self.whitelists.get(source, [])
        normalized = {
            "timestamp": raw_log.get("timestamp") or raw_log.get("date") or raw_log.get("@timestamp") or datetime.now(timezone.utc).isoformat(),
            "source_ip": None,
            "dst_port": None,
            "protocol": None,
            "event_type": None,
            "honeypot": source,
            "extra_info": {}
        }
        for std_key, raw_keys in mapping.items():
            normalized[std_key] = self._first_value(raw_log, raw_keys)
        for field in whitelist:
            val = self._get_nested_value(raw_log, field) if '.' in field else raw_log.get(field)
            if val is not None: normalized["extra_info"][field] = val

        # Cowrie réutilise `shasum` pour plusieurs artefacts. Un hash de
        # journal TTY ne doit jamais être présenté comme un hash de malware.
        if source == "cowrie":
            shasum = raw_log.get("shasum")
            event_type = normalized.get("event_type") or ""
            if shasum and event_type in {
                "cowrie.session.file_download", "cowrie.session.file_upload"
            }:
                normalized["extra_info"]["file_hash"] = shasum
                normalized["extra_info"]["file_hash_type"] = "sha256"
            elif shasum and event_type == "cowrie.log.closed":
                normalized["extra_info"]["tty_hash"] = shasum

        for path, hash_type in self.file_hash_mappings.get(source, ()):
            value = self._get_nested_value(raw_log, path)
            if value:
                normalized["extra_info"]["file_hash"] = value
                normalized["extra_info"]["file_hash_type"] = hash_type
                break
        return normalized
