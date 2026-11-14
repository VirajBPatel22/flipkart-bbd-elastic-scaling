import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('experiments',Path(__file__).parents[2]/'load-tests/run-aws-experiments.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
runner.args=SimpleNamespace(asg='dedicated-test-asg')

class RestorationTests(unittest.TestCase):
    def run_context(self, suspended=False, fail_restore=False):
        calls=[]
        initial={'minimum':1,'maximum':3,'desired':2}
        def aws(service,operation,*options):
            calls.append((operation,options))
            if operation=='describe-scheduled-actions':return {}
            if operation=='describe-auto-scaling-groups':return {'AutoScalingGroups':[{'SuspendedProcesses':[{'ProcessName':'AlarmNotification'}] if suspended else []}]}
            if fail_restore and operation=='update-auto-scaling-group':raise RuntimeError('Credentials expired')
            return {}
        with patch.object(runner,'state',return_value=initial),patch.object(runner,'aws',side_effect=aws):
            with self.assertRaises(RuntimeError):
                with runner.fixed_configuration():raise RuntimeError('k6 failed')
        return calls

    def test_capacity_restored_after_test_failure(self):
        calls=self.run_context()
        update=next(options for operation,options in calls if operation=='update-auto-scaling-group')
        self.assertIn('2',update)
        self.assertEqual(calls[-1][0],'resume-processes')

    def test_preexisting_suspension_is_preserved(self):
        calls=self.run_context(suspended=True)
        self.assertNotIn('resume-processes',[c[0] for c in calls])
        self.assertNotIn('suspend-processes',[c[0] for c in calls])

    def test_alarm_process_resumed_even_if_capacity_restore_fails(self):
        self.assertEqual(self.run_context(fail_restore=True)[-1][0],'resume-processes')

    def test_unbounded_group_rejected_before_any_mutation(self):
        with patch.object(runner,'state',return_value={'maximum':5}),patch.object(runner,'aws') as aws:
            with self.assertRaisesRegex(RuntimeError,'above 3'):
                with runner.fixed_configuration():pass
            aws.assert_not_called()

if __name__=='__main__':unittest.main()
