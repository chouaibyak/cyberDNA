import unittest

from core.extractor import FeatureExtractor


class WebShellDetectionTests(unittest.TestCase):
    def test_php_system_payload_has_critical_danger_score(self):
        score = FeatureExtractor()._calculate_universal_danger({
            "honeypot": "honeytrap",
            "extra_info": {
                "http.method": "POST",
                "http.url": "/upload.php",
                "payload": "shell=<?php system($_GET['cmd']); ?>",
            },
        })
        self.assertEqual(score, 100)


if __name__ == "__main__":
    unittest.main()
