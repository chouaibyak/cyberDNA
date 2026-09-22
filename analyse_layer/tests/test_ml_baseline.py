import csv
import tempfile
import unittest
from pathlib import Path

import numpy as np

from core.detector import SentinelML


class SentinelMLBaselineTests(unittest.TestCase):
    def _baseline(self, directory):
        path = Path(directory) / "baseline.csv"
        with path.open("w", newline="") as handle:
            writer = csv.writer(handle)
            for events in range(1, 121):
                writer.writerow([events, 1, 0, 0, 1, events / 300, 300 / max(events - 1, 1)])
        return path

    def test_loads_csv_instead_of_hardcoded_baseline(self):
        with tempfile.TemporaryDirectory() as directory:
            detector = SentinelML(contamination=0.05, baseline_path=self._baseline(directory))
            self.assertEqual(detector.baseline.shape, (120, 7))
            np.testing.assert_array_equal(detector.baseline[0, :5], [1, 1, 0, 0, 1])

    def test_missing_baseline_fails_with_clear_message(self):
        with self.assertRaisesRegex(FileNotFoundError, "create_baseline.py"):
            SentinelML(baseline_path="/does/not/exist/baseline.csv")


if __name__ == "__main__":
    unittest.main()
