#!/usr/bin/env python3
"""
Starts the Flipkart BBD Elastic Scaling AWS demonstration.
Supports fast in-place resume (starts stopped instances in seconds)
with live, detailed progress logging, before opening the SSM dashboard tunnel.
"""

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
ACCOUNT = '418295404932'
RELEASE = '/workspace/infrastructure/aws/active-images.tfvars.json'
ASG_NAME = 'bbd-it457-backend'
PROJECT = 'bbd-it457'

def log(msg):
    t = time.strftime('%H:%M:%S')
    print(f"[{t}] {msg}", flush=True)

def aws(*args):
    result = subprocess.run(
        ['aws', *args, '--profile', PROFILE, '--region', REGION, '--output', 'json'],
        check=True, capture_output=True, text=True
    )
    return json.loads(result.stdout or '{}')

def terraform(*args, capture=False):
    log(f"Running Terraform: {' '.join(args)}...")
    credentials = aws('configure', 'export-credentials', '--format', 'process')
    env = dict(
        os.environ,
        AWS_ACCESS_KEY_ID=credentials['AccessKeyId'],
        AWS_SECRET_ACCESS_KEY=credentials['SecretAccessKey'],
        AWS_SESSION_TOKEN=credentials['SessionToken'],
        AWS_REGION=REGION
    )
    command = [
        'docker', 'run', '--rm',
        '-e', 'AWS_REGION',
        '-e', 'AWS_ACCESS_KEY_ID',
        '-e', 'AWS_SECRET_ACCESS_KEY',
        '-e', 'AWS_SESSION_TOKEN',
        '-e', 'TF_DATA_DIR=/terraform-data',
        '-v', 'bbd-it457-terraform-data:/terraform-data',
        '-v', f'{ROOT}:/workspace',
        '-w', '/workspace/infrastructure/terraform',
        'hashicorp/terraform:1.13.5',
        *args
    ]
    result = subprocess.run(command, env=env, check=True, stdout=subprocess.PIPE if capture else None, text=True)
    return json.loads(result.stdout) if capture else None

def get_current_public_ip():
    with urllib.request.urlopen('https://checkip.amazonaws.com', timeout=10) as response:
        return ipaddress.IPv4Address(response.read().decode().strip())

def refresh_demo_access(current_ip):
    settings = ROOT / 'infrastructure/terraform/terraform.tfvars'
    if not settings.exists():
        return
    text = settings.read_text()
    if not re.search(r'demo_http\s*=\s*true', text):
        return
    text, count = re.subn(r'allowed_cidrs\s*=\s*\[[^\]]*\]', f'allowed_cidrs = ["{current_ip}/32"]', text)
    if count == 1:
        settings.write_text(text)
        log(f"Updated terraform.tfvars allowed_cidrs to {current_ip}/32")

def sync_security_group_ip(current_ip):
    """Fast in-place update of ALB security group without waiting for Terraform."""
    try:
        lbs = aws('elbv2', 'describe-load-balancers', '--names', PROJECT)
        if not lbs.get('LoadBalancers'):
            return False
        lb = lbs['LoadBalancers'][0]
        sg_id = lb['SecurityGroups'][0]
        sg_info = aws('ec2', 'describe-security-groups', '--group-ids', sg_id)
        rules = sg_info['SecurityGroups'][0].get('IpPermissions', [])

        target_cidr = f"{current_ip}/32"
        existing_cidrs = []
        for r in rules:
            if r.get('FromPort') == 80 and r.get('ToPort') == 80:
                for ip_range in r.get('IpRanges', []):
                    existing_cidrs.append(ip_range.get('CidrIp'))

        if target_cidr in existing_cidrs:
            log(f"ALB Security Group already permits current IP: {target_cidr}")
            return True

        for old_cidr in existing_cidrs:
            log(f"Revoking previous ALB allowed CIDR: {old_cidr}...")
            aws('ec2', 'revoke-security-group-ingress', '--group-id', sg_id,
                '--protocol', 'tcp', '--port', '80', '--cidr', old_cidr)

        log(f"Authorizing current IP: {target_cidr} on ALB port 80...")
        aws('ec2', 'authorize-security-group-ingress', '--group-id', sg_id,
            '--protocol', 'tcp', '--port', '80', '--cidr', target_cidr)
        return True
    except Exception as e:
        log(f"Security group check notice: {e}")
        return False

def try_fast_resume(current_ip):
    """
    If instances & ALB already exist, starts them directly in seconds
    instead of running a full 3-minute Dockerized Terraform apply.
    """
    try:
        log("Checking existing AWS resources for fast in-place resume...")
        lbs = aws('elbv2', 'describe-load-balancers', '--names', PROJECT)
        if not lbs.get('LoadBalancers'):
            log("Load balancer not found; falling back to full Terraform.")
            return None
        lb = lbs['LoadBalancers'][0]
        public_url = f"http://{lb['DNSName']}"

        tgs = aws('elbv2', 'describe-target-groups', '--names', f"{PROJECT}-backend")
        if not tgs.get('TargetGroups'):
            return None
        tg_arn = tgs['TargetGroups'][0]['TargetGroupArn']

        reservations = aws(
            'ec2', 'describe-instances',
            '--filters', f'Name=tag:Project,Values={PROJECT}',
            'Name=instance-state-name,Values=running,stopped,pending'
        ).get('Reservations', [])

        web_instances = {}
        for res in reservations:
            for inst in res.get('Instances', []):
                for tag in inst.get('Tags', []):
                    if tag['Key'] == 'Name':
                        for role in ('frontend', 'dashboard'):
                            if role in tag['Value']:
                                web_instances[role] = {
                                    'id': inst['InstanceId'],
                                    'state': inst['State']['Name']
                                }

        if 'frontend' not in web_instances or 'dashboard' not in web_instances:
            log("Standalone web instances not found; falling back to Terraform.")
            return None

        # Sync IP
        sync_security_group_ip(current_ip)

        # Start stopped web instances
        to_start = [v['id'] for v in web_instances.values() if v['state'] == 'stopped']
        if to_start:
            log(f"Powering on stopped instances: {', '.join(to_start)}...")
            aws('ec2', 'start-instances', '--instance-ids', *to_start)
            log("Instances powered on. Linux kernel and Docker containers starting...")
        else:
            log(f"Web instances already running (frontend: {web_instances['frontend']['id']}, dashboard: {web_instances['dashboard']['id']})")

        # Scale ASG
        asgs = aws('autoscaling', 'describe-auto-scaling-groups', '--auto-scaling-group-names', ASG_NAME).get('AutoScalingGroups', [])
        if asgs:
            asg = asgs[0]
            if asg.get('DesiredCapacity', 0) < 1 or asg.get('MinSize', 0) < 1:
                log(f"Scaling Auto Scaling Group '{ASG_NAME}' to 1 backend instance...")
                aws('autoscaling', 'update-auto-scaling-group',
                    '--auto-scaling-group-name', ASG_NAME,
                    '--min-size', '1', '--max-size', '2', '--desired-capacity', '1')
                log("ASG scaled up. EC2 backend instance launching...")
            else:
                log("ASG backend capacity already active (desired >= 1).")

        return {
            'public_url': public_url,
            'target_group_arn': tg_arn,
            'dashboard_instance_id': web_instances['dashboard']['id']
        }
    except Exception as e:
        log(f"Fast-resume note ({e}); falling back to Terraform.")
        return None

def restore_results(instance):
    backup = ROOT / 'infrastructure/validation/shutdown-backup/experiments.json'
    rows = [r for r in json.loads(backup.read_text()) if r.get('id', '').startswith('ui-')] if backup.exists() else []
    encoded = base64.b64encode(json.dumps(rows).encode()).decode()
    script = """python3 - <<'PY'
import base64,json,pathlib,urllib.request
try:
    urllib.request.urlopen('http://127.0.0.1:5001/api/health',timeout=3).read()
except Exception as e:
    print(f"Monitoring API not ready: {e}")
    exit(1)
p=pathlib.Path('/opt/bbd/test-results')
assert p.is_dir()
count = 0
for row in json.loads(base64.b64decode('PAYLOAD')):
    name=row['id']
    if name.startswith('ui-') and all(c.isalnum() or c=='-' for c in name):
        (p/(name+'.summary.json')).write_text(json.dumps(row))
        count += 1
print(f"Restored {count} experiment summaries. Dashboard is ready.")
PY""".replace('PAYLOAD', encoded)

    try:
        sent = aws('ssm', 'send-command', '--instance-ids', instance,
                   '--document-name', 'AWS-RunShellScript',
                   '--parameters', json.dumps({'commands': [script], 'executionTimeout': ['20']}))
        cmd_id = sent['Command']['CommandId']
        for _ in range(8):
            time.sleep(1.5)
            result = aws('ssm', 'get-command-invocation', '--command-id', cmd_id, '--instance-id', instance)
            if result['Status'] == 'Success':
                log(result['StandardOutputContent'].strip())
                return True
            if result['Status'] in ('Failed', 'TimedOut', 'Cancelled'):
                return False
    except Exception:
        return False
    return False

def wait_for_project(target_group, dashboard_instance):
    log("Monitoring application readiness and target group health...")
    deadline = time.monotonic() + 600
    start_time = time.monotonic()
    ssm_online = False
    results_restored = False

    while time.monotonic() < deadline:
        elapsed = int(time.monotonic() - start_time)

        # 1. Check SSM agent on dashboard instance
        if not ssm_online:
            try:
                ssm_info = aws('ssm', 'describe-instance-information',
                               '--filters', f'Key=InstanceIds,Values={dashboard_instance}')
                info_list = ssm_info.get('InstanceInformationList', [])
                if info_list and info_list[0].get('PingStatus') == 'Online':
                    ssm_online = True
                    log(f"[{elapsed:02d}s] Dashboard instance SSM agent: ONLINE")
                else:
                    status = info_list[0].get('PingStatus', 'Offline') if info_list else 'Waiting'
                    log(f"[{elapsed:02d}s] Dashboard instance SSM agent: {status} (booting services)...")
            except Exception:
                pass

        # 2. Check ALB target group health
        backend_healthy = False
        try:
            targets = aws('elbv2', 'describe-target-health', '--target-group-arn', target_group).get('TargetHealthDescriptions', [])
            if targets:
                states = [f"{t['Target']['Id']}: {t['TargetHealth']['State']}" for t in targets]
                log(f"[{elapsed:02d}s] Backend target health: {', '.join(states)}")
                if any(t['TargetHealth']['State'] == 'healthy' for t in targets):
                    backend_healthy = True
            else:
                log(f"[{elapsed:02d}s] ASG backend target registering with ALB...")
        except Exception as e:
            log(f"[{elapsed:02d}s] Checking ALB target health: {e}")

        # 3. Restore experiment data once dashboard SSM is online
        if ssm_online and not results_restored:
            log(f"[{elapsed:02d}s] Attempting to restore experiment history to dashboard...")
            if restore_results(dashboard_instance):
                results_restored = True

        if backend_healthy and results_restored:
            log(f"All components healthy and verified in {elapsed}s!")
            return

        time.sleep(5)

    raise RuntimeError('Readiness timed out after 10 minutes. Inspect SSM/CloudWatch logs.')

def main():
    if os.name == 'nt':
        raise RuntimeError('Run this command through WSL: wsl python3 infrastructure/scripts/start-project.py')

    log(f"Verifying AWS credentials for profile '{PROFILE}'...")
    identity = aws('sts', 'get-caller-identity')
    if identity.get('Account') != ACCOUNT:
        raise RuntimeError(f"Wrong AWS account ({identity.get('Account')}); expected {ACCOUNT}.")
    log(f"Authenticated as {identity.get('Arn')}")

    current_ip = get_current_public_ip()
    log(f"Current detected public IP: {current_ip}")
    refresh_demo_access(current_ip)

    force_rebuild = '--rebuild' in sys.argv
    info = None
    if not force_rebuild:
        info = try_fast_resume(current_ip)

    if not info:
        log("Executing Terraform deployment...")
        terraform('init', '-input=false')
        terraform('apply', '-input=false', '-auto-approve', f'-var-file={RELEASE}')
        outputs = {name: item['value'] for name, item in terraform('output', '-json', capture=True).items()}
        info = {
            'public_url': outputs['public_url'],
            'target_group_arn': outputs['target_group_arn'],
            'dashboard_instance_id': outputs['dashboard_instance_id']
        }

    instance = info['dashboard_instance_id']
    log(f"Storefront Public URL: {info['public_url']}")

    wait_for_project(info['target_group_arn'], instance)

    print("\n" + "="*70)
    print(f"STOREFRONT URL: {info['public_url']}")
    print("DASHBOARD URL : http://127.0.0.1:18080/dashboard/ (via active tunnel)")
    print("="*70)
    print("Tunnel is now OPEN. Press Ctrl+C anytime to close the tunnel.")
    print("AWS compute continues running until: wsl python3 infrastructure/scripts/stop-project.py\n")

    env = dict(os.environ, AWS_PROFILE=PROFILE)
    subprocess.run([sys.executable, str(ROOT / 'infrastructure/scripts/start-aws-tunnel.py'),
                    'dashboard', '--target', instance], env=env, check=True)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nTunnel closed. AWS resources continue running until stopped with stop-project.py.")
    except Exception as error:
        print(f"\nStartup failed: {error}", file=sys.stderr)
        sys.exit(1)
