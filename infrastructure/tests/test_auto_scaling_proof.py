import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('auto_proof', Path(__file__).parents[1] / 'scripts/prove-auto-scaling.py')
proof = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proof)


class ProofAttributionTests(unittest.TestCase):
    def test_only_completed_matching_alarm_actions_after_test_start_count(self):
        activities = [
            {'StatusCode': 'Successful', 'StartTime': '2026-11-09T12:05:00+00:00', 'Cause': 'alarm high-alarm triggered policy'},
            {'StatusCode': 'Successful', 'StartTime': '2026-11-09T11:00:00+00:00', 'Cause': 'alarm high-alarm triggered policy'},
            {'StatusCode': 'Failed', 'StartTime': '2026-11-09T12:06:00+00:00', 'Cause': 'alarm high-alarm triggered policy'},
            {'StatusCode': 'Successful', 'StartTime': '2026-11-09T12:07:00+00:00', 'Cause': 'user changed desired capacity'},
        ]
        self.assertEqual(proof.successful_alarm_activity(activities, 'high-alarm', '2026-11-09T12:00:00+00:00'), activities[:1])
        self.assertEqual(proof.successful_alarm_activity(activities, 'low-alarm', '2026-11-09T12:00:00+00:00'), [])
