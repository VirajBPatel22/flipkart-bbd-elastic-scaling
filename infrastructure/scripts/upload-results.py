"""Manually copy selected non-secret experiment summaries to the dashboard using SSM Run Command."""
import argparse,base64,json,re,subprocess
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--region',required=True);p.add_argument('--instance',required=True);p.add_argument('summaries',nargs='+',type=Path)
a=p.parse_args()
commands=['install -d -m 755 /opt/bbd/results']
for path in a.summaries:
    if not re.fullmatch(r'[a-zA-Z0-9_.-]+\.summary\.json',path.name):p.error('Only named .summary.json files are accepted')
    value=json.loads(path.read_text())
    if value.get('environment')!='AWS' or not value.get('valid'):p.error('Only valid AWS summaries are accepted')
    encoded=base64.b64encode(json.dumps(value).encode()).decode()
    commands.append(f"printf '%s' '{encoded}' | base64 -d > /opt/bbd/results/{path.name}")
    commands.append(f'chmod 644 /opt/bbd/results/{path.name}')
result=subprocess.run(['aws','ssm','send-command','--region',a.region,'--instance-ids',a.instance,'--document-name','AWS-RunShellScript','--parameters',json.dumps({'commands':commands}),'--query','Command.CommandId','--output','text'],capture_output=True,text=True,check=True)
print('SSM command submitted:',result.stdout.strip())
print('Verify command success in Systems Manager > Run Command, then refresh the dashboard.')
