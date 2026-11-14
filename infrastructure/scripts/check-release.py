"""Read-only Git candidate audit; never prints secret values."""
from pathlib import Path
import re,subprocess,sys
root=Path(__file__).resolve().parents[2]
paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
problems=[]
for name in filter(None,paths):
    path=root/name
    if not path.is_file():continue
    if path.name=='.env' or (path.name.startswith('.env.') and path.name!='.env.example') or path.suffix in ['.tfstate','.tfplan','.pem','.key']:
        problems.append((name,'private/generated file is a Git candidate'));continue
    if path.stat().st_size>2_000_000:problems.append((name,'large file needs review'));continue
    try:text=path.read_text(encoding='utf-8')
    except (UnicodeError,OSError):continue
    patterns=[r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']
    for pattern in patterns:
        if re.search(pattern,text):problems.append((name,'possible credential or private key; inspect privately'))
    # Permit obvious examples but flag actual database URLs in release candidates.
    for match in re.finditer(r'postgres(?:ql)?://[^\s\'"<>]+',text):
        value=match.group()
        if '@' in value and not any(token in value.lower() for token in ['example','your-','password','user:','host','project-ref','[your']):
            problems.append((name,'possible database connection URL; inspect privately'))
if problems:
    for name,reason in problems:print(name+': '+reason)
    sys.exit(1)
print(f'Reviewed {len(list(filter(None,paths)))} Git candidate paths; no configured secret patterns found. Manually inspect the diff before committing.')
