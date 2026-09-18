import unittest

from core.correlation import BruteForceCorrelator


def failed_login(second, source_ip="192.168.189.10"):
    return {
        "timestamp": f"2026-09-18T10:00:{second:02d}+00:00",
        "source_ip": source_ip,
        "honeypot": "cowrie",
        "protocol": "ssh",
        "dst_port": 2222,
        "event_type": "cowrie.login.failed",
        "extra_info": {"password": "invalid"},
    }


class BruteForceCorrelatorTests(unittest.TestCase):
    def test_emits_one_campaign_only_after_five_related_failures(self):
        correlator = BruteForceCorrelator(window_seconds=300, threshold=5)
        results = [correlator.observe(failed_login(second)) for second in range(5)]

        self.assertFalse(results[3]["is_brute_force"])
        self.assertTrue(results[4]["is_brute_force"])
        self.assertEqual(results[4]["event_count"], 5)
        self.assertEqual(results[4]["risk_score"], 75)

    def test_does_not_mix_attackers(self):
        correlator = BruteForceCorrelator(window_seconds=300, threshold=5)
        for second in range(4):
            correlator.observe(failed_login(second, "192.168.189.10"))

        result = correlator.observe(failed_login(4, "192.168.189.11"))
        self.assertEqual(result["event_count"], 1)
        self.assertFalse(result["is_brute_force"])


if __name__ == "__main__":
    unittest.main()
