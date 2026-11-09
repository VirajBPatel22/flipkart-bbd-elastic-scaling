#!/usr/bin/env python3
"""Redeploy the paused IT457 AWS project and open its dashboard tunnel (run in WSL)."""
import base64
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PROFILE = os.environ.get('AWS_PROFILE', 'it457-login')
REGION = 'ap-south-1'

def aws(*args):
    result = subprocess.run(['aws', *args, '--profile', PROFILE, '--region', REGION, '--output', 'json'], check=True, capture_output=True)
    return json.loads(result.stdout or '{}')

def terraform(*args, capture=False):
    credentials = aws('configure', 'export-credentials', '--format', 'process')
    env = dict(os.environ, AWS_ACCESS_KEY_ID=credentials['AccessKeyId'], AWS_SECRET_ACCESS_KEY=credentials['SecretAccessKey'], AWS_SESSION_TOKEN=credentials['SessionToken'], AWS_REGION=REGION)
    command = ['docker', 'run', '--rm', '-e', 'AWS_REGION', '-e', 'AWS_ACCESS_KEY_ID', '-e', 'AWS_SECRET_ACCESS_KEY', '-e', 'AWS_SESSION_TOKEN', '-e', 'TF_DATA_DIR=/terraform-data', '-v', 'bbd-it457-terraform-data:/terraform-data', '-v', str(ROOT)+':/workspace', '-w', '/workspace/infrastructure/terraform', 'hashicorp/terraform:1.13.5', *args]
    result = subprocess.run(command, env=env, check=True, stdout=subprocess.PIPE if capture else None, text=True)
    return json.loads(result.stdout) if capture else None

def restore_results(instance):
    backup = ROOT/'infrastructure/validation/shutdown-backup/experiments.json'
    rows = [r for r in json.loads(backup.read_text()) if r['id'].startswith('ui-')] if backup.exists() else []
    encoded = base64.b64encode(json.dumps(rows).encode()).decode()
    script = """python3 - <<'PY'
import base64,json,pathlib,urllib.request
urllib.request.urlopen('http://127.0.0.1:5001/api/health',timeout=5).read()
p=pathlib.Path('/opt/bbd/test-results')
assert p.is_dir()
for row in json.loads(base64.b64decode('PAYLOAD')):
 name=row['id']
 assert name.startswith('ui-') and all(c.isalnum() or c=='-' for c in name)
 (p/(name+'.summary.json')).write_text(json.dumps(row))
print('Dashboard is ready; saved API results restored')
PY""".replace('PAYLOAD', encoded)
    sent = aws('ssm','send-command','--instance-ids',instance,'--document-name','AWS-RunShellScript','--parameters',json.dumps({'commands':[script],'executionTimeout':['30']}))
    for _ in range(20):
        time.sleep(2)
        result = aws('ssm','get-command-invocation','--command-id',sent['Command']['CommandId'],'--instance-id',instance)
        if result['Status']=='Success':
            print(result['StandardOutputContent'].strip()); return True
        if result['Status'] in ('Failed','TimedOut','Cancelled'): return False
    return False

def main():
    if os.name == 'nt': raise RuntimeError('Run this command through WSL, as shown in the project documentation.')
    if aws('sts','get-caller-identity')['Account'] != '418295404932': raise RuntimeError('Wrong AWS account; no resources changed.')
    # The HTTP demo admits only the current workstation public IPv4 address.
    settings = ROOT/'infrastructure/terraform/terraform.tfvars'
    text = settings.read_text()
    if re.search(r'demo_http\s*=\s*true',text):
        with urllib.request.urlopen('https://checkip.amazonaws.com',timeout=15) as r: current_ip = str(ipaddress.IPv4Address(r.read().decode().strip()))
        text, count = re.subn(r'allowed_cidrs\s*=\s*\[[^\]]*\]',f'allowed_cidrs = ["{current_ip}/32"]',text)
        if count != 1: raise RuntimeError('Cannot safely update the demo allowed IP.')
        settings.write_text(text)
    print('Redeploying the AWS project. Normal AWS charges resume now.',flush=True)
    terraform('init','-input=false')
    terraform('apply','-input=false','-auto-approve','-var-file=/workspace/infrastructure/aws/active-images.tfvars.json')
    outputs=terraform('output','-json',capture=True)
    instance=outputs['dashboard_instance_id']['value']
    print('Storefront:',outputs['public_url']['value'],flush=True)
    deadline=time.monotonic()+1200
    while time.monotonic()<deadline:
        try:
            targets=aws('elbv2','describe-target-health','--target-group-arn',outputs['target_group_arn']['value'])['TargetHealthDescriptions']
            if any(t['TargetHealth']['State']=='healthy' for t in targets) and restore_results(instance): break
        except subprocess.CalledProcessError: pass
        print('Waiting for application bootstrap and healthy targets...',flush=True);time.sleep(15)
    else: raise RuntimeError('Readiness timed out. Resources are deployed; inspect SSM before retrying.')
    print('Dashboard: http://127.0.0.1:18080/dashboard/ (keep this terminal open)',flush=True)
    env=dict(os.environ,AWS_PROFILE=PROFILE)
    subprocess.run([sys.executable,str(ROOT/'infrastructure/scripts/start-aws-tunnel.py'),'dashboard','--target',instance],env=env,check=True)

if __name__=='__main__':
    try: main()
    except KeyboardInterrupt: print('Tunnel closed. AWS resources continue running until explicitly paused.')
    except Exception as error: print('Startup did not complete:',error,file=sys.stderr);sys.exit(1)
