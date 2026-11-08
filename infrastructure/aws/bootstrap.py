"""Executed by systemd on EC2. Secrets are fetched at boot, never stored in user-data/state."""
import base64
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path('/opt/bbd')

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def write_env(path, values):
    for key, value in values.items():
        if '\n' in str(value) or '\r' in str(value):
            raise ValueError('Environment values must be single-line; encode CA as base64')
    path.write_text(''.join(f'{k}={v}\n' for k, v in values.items()))
    path.chmod(0o600)

def secret(name, region):
    result = run(['aws', 'ssm', 'get-parameter', '--region', region, '--name', name, '--with-decryption', '--output', 'json'], capture_output=True)
    return json.loads(json.loads(result.stdout)['Parameter']['Value'])

def instance_id():
    request = urllib.request.Request('http://169.254.169.254/latest/api/token', method='PUT', headers={'X-aws-ec2-metadata-token-ttl-seconds':'60'})
    with urllib.request.urlopen(request, timeout=3) as response: token=response.read().decode()
    request = urllib.request.Request('http://169.254.169.254/latest/meta-data/instance-id', headers={'X-aws-ec2-metadata-token':token})
    with urllib.request.urlopen(request, timeout=3) as response: return response.read().decode()

def container(name, image, extra, c):
    registry=image.split('/')[0]
    if '.dkr.ecr.' in registry:
        password=run(['aws','ecr','get-login-password','--region',c['region']],capture_output=True).stdout
        run(['docker','login','--username','AWS','--password-stdin',registry],input=password,stdout=subprocess.DEVNULL)
    run(['docker','pull',image],stdout=subprocess.DEVNULL)
    # Only this project's named container is replaced on this dedicated EC2 instance.
    subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    run(['docker','run','-d','--name',name,'--restart','unless-stopped','--log-driver','awslogs',
         '--log-opt',f"awslogs-region={c['region']}",'--log-opt',f"awslogs-group={c['log_group']}",
         '--log-opt',f'awslogs-stream={instance_id()}/{name}',*extra,image],stdout=subprocess.DEVNULL)

def main():
    c=json.loads((ROOT/'config.json').read_text())
    role=c['role']
    if role=='backend':
        s=secret(c['secret_parameter'],c['region'])
        if not s.get('database_url') or not s.get('load_test_token'): raise ValueError('Backend parameter is incomplete')
        env={'PORT':5000,'NODE_ENV':'production','ENVIRONMENT':'AWS','INSTANCE_ID':instance_id(),
             'DATABASE_URL':s['database_url'],'LOAD_TEST_TOKEN':s['load_test_token'],
             'ENABLE_DEMO_COMPUTE':str(c['enable_compute']).lower(),'DB_SSL_REJECT_UNAUTHORIZED':'true',
             'DATABASE_CA_BASE64':s.get('database_ca_base64',''),'MAX_CONCURRENT_COMPUTE_JOBS':2}
        write_env(ROOT/'backend.env',env)
        container('bbd-backend',c['images']['backend'],['--env-file',str(ROOT/'backend.env'),'-p','5000:5000'],c)
    elif role=='frontend':
        container('bbd-frontend',c['images']['frontend'],['-p','80:80'],c)
    elif role=='dashboard':
        s=secret(c['secret_parameter'],c['region'])
        username=s.get('username','');hashed=s.get('password_hash','')
        if not username or any(k in username for k in ':\r\n') or not hashed.startswith('$') or any(k in hashed for k in '\r\n'):
            raise ValueError('Dashboard htpasswd parameter is invalid')
        auth=ROOT/'dashboard.htpasswd';auth.write_text(username+':'+hashed+'\n');auth.chmod(0o644)
        env={'PORT':5001,'NODE_ENV':'production','ENVIRONMENT':'AWS','AWS_REGION':c['region'],
             'ASG_NAME':c['asg_name'],'TARGET_GROUP_ARN':c['target_group_arn'],'LOAD_BALANCER_ARN':c['load_balancer_arn'],
             'RESULTS_DIR':'/results','CORS_ORIGIN':c['public_url']}
        write_env(ROOT/'monitoring.env',env)
        (ROOT/'results').mkdir(exist_ok=True)
        container('bbd-monitoring',c['images']['monitoring'],['--network','host','--env-file',str(ROOT/'monitoring.env'),'-v',f'{ROOT}/results:/results:ro'],c)
        container('bbd-dashboard',c['images']['dashboard'],['--network','host','-v',f'{ROOT}/dashboard.conf:/etc/nginx/conf.d/default.conf:ro','-v',f'{auth}:/etc/nginx/bbd.htpasswd:ro'],c)

if __name__=='__main__':
    try: main()
    except Exception:
        # Do not print subprocess stderr / secret content into cloud-init or journal logs.
        print('BBD startup failed. Check IAM, SSM parameter schema, ECR images, and network access. No secret values logged.')
        raise SystemExit(1)
