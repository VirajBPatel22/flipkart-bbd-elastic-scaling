import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('bootstrap',Path(__file__).parents[1]/'aws/bootstrap.py')
bootstrap=importlib.util.module_from_spec(spec);spec.loader.exec_module(bootstrap)

class StartupTests(unittest.TestCase):
    def test_env_injection_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):bootstrap.write_env(Path(directory)/'app.env',{'DATABASE_URL':'value\nINJECTED=true'})

    def test_runtime_secret_uses_ssm_not_literal(self):
        calls=[]
        def run(args,**kwargs):
            calls.append(args)
            class Result:stdout=b'{"Parameter":{"Value":"{\\"database_url\\":\\"fixture\\"}"}}'
            return Result()
        with patch.object(bootstrap,'run',side_effect=run):
            self.assertEqual(bootstrap.secret('/test/backend','ap-south-1')['database_url'],'fixture')
        self.assertIn('--with-decryption',calls[0])

    def test_only_named_project_container_replaced(self):
        calls=[]
        with patch.object(bootstrap,'run',side_effect=lambda args,**kwargs:calls.append(args)),patch.object(bootstrap.subprocess,'run') as remove,patch.object(bootstrap,'instance_id',return_value='i-test'):
            bootstrap.container('bbd-backend','example.com/backend@sha256:fixture',[],{'region':'ap-south-1','log_group':'/it457/test'})
            self.assertEqual(remove.call_args.args[0],['docker','rm','-f','bbd-backend'])
        self.assertTrue(any('--restart' in command for command in calls))

if __name__=='__main__':unittest.main()
