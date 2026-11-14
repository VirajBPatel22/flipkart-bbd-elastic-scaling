"""Manual setup: prompts privately and sends SecureString JSON via a permission-restricted temp file."""
import argparse
import base64
import getpass
import json
import os
from pathlib import Path
import subprocess
import tempfile

parser=argparse.ArgumentParser()
parser.add_argument('kind', choices=['backend','dashboard'])
parser.add_argument('--region',required=True)
parser.add_argument('--name',required=True)
parser.add_argument('--ca-file',type=Path)
parser.add_argument('--overwrite',action='store_true')
args=parser.parse_args()
if args.kind=='backend':
    database=getpass.getpass('Existing read-only PostgreSQL connection URL (hidden): ')
    token=getpass.getpass('Private compute test token (hidden; at least 32 characters): ')
    if not database.startswith(('postgresql://','postgres://')) or len(token)<32: raise SystemExit('Invalid URL or short token')
    value={'database_url':database,'load_test_token':token}
    if args.ca_file: value['database_ca_base64']=base64.b64encode(args.ca_file.read_bytes()).decode()
else:
    username=input('Dashboard username: ').strip()
    password=getpass.getpass('Dashboard password (hidden; at least 16 characters): ')
    confirm=getpass.getpass('Repeat dashboard password: ')
    if not username or any(k in username for k in ':\r\n') or password!=confirm or len(password)<16: raise SystemExit('Invalid username/password')
    # OpenSSL reads password from stdin; it never appears in process arguments.
    hashed=subprocess.run(['openssl','passwd','-6','-stdin'],input=password+'\n',text=True,capture_output=True,check=True).stdout.strip()
    value={'username':username,'password_hash':hashed}
if input(f'Write SecureString {args.name} in {args.region}? Type WRITE: ')!='WRITE': raise SystemExit('Cancelled')
payload={'Name':args.name,'Type':'SecureString','Value':json.dumps(value),'Overwrite':args.overwrite}
name=None
try:
    with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',delete=False) as file:
        name=file.name
        os.chmod(name,0o600)
        json.dump(payload,file)
    result=subprocess.run(['aws','ssm','put-parameter','--region',args.region,'--cli-input-json','file://'+name],capture_output=True)
    if result.returncode: raise SystemExit('SSM write failed. Check credentials, parameter existence and permissions; secret values were not printed.')
    print('SecureString saved. Value was not written to the repository or displayed.')
finally:
    if name: Path(name).unlink(missing_ok=True)
