"""Manual AWS experiment runner. Default observe mode is read-only except local result files.
Fixed mode changes ASG capacity temporarily; requires an explicit flag and restores settings.
"""
import argparse
import datetime
import json
import os
from pathlib import Path
import subprocess
import threading
import time
import urllib.request
from urllib.parse import urlsplit
import uuid
import sys
import signal
from contextlib import contextmanager

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(Path(__file__).parent))

def valid_url(url, allow_ssm_tunnel=False):
    try:
        parsed=urlsplit(url)
        if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('','/'):
            return False
        port=parsed.port
        return parsed.scheme=='https' or (allow_ssm_tunnel and parsed.scheme=='http' and parsed.hostname in ('127.0.0.1','::1') and port is not None)
    except ValueError:
        return False

def aws(service, operation, *options):
    result=subprocess.run(['aws',service,operation,'--region',args.region,*options,'--output','json'],capture_output=True,check=True)
    return json.loads(result.stdout or '{}')

def state():
    group=aws('autoscaling','describe-auto-scaling-groups','--auto-scaling-group-names',args.asg)['AutoScalingGroups'][0]
    targets=aws('elbv2','describe-target-health','--target-group-arn',args.target_group)['TargetHealthDescriptions']
    ids={i['InstanceId'] for i in group['Instances'] if i['LifecycleState']=='InService'}
    healthy={t['Target']['Id'] for t in targets if t['TargetHealth']['State']=='healthy'}
    return {'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'desired':group['DesiredCapacity'],'minimum':group['MinSize'],'maximum':group['MaxSize'],'inService':len(ids),'healthy':len(ids & healthy),'instances':group['Instances'],'targets':targets}

def wait_capacity(count):
    until=time.monotonic()+args.ready_timeout
    while time.monotonic()<until:
        s=state()
        if s['inService']==count and s['healthy']==count:return
        time.sleep(10)
    raise RuntimeError('Healthy capacity timeout; no load test started')

def run_test(replicas):
    ident=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]+'-aws-'+args.mode+'-'+str(replicas)
    prefix=Path(__file__).parent/'results'/ident
    prefix.parent.mkdir(exist_ok=True)
    stop=threading.Event()
    def sample():
        with prefix.with_suffix('.aws.jsonl').open('w') as f:
            while not stop.is_set():
                try: record=state()
                except Exception:record={'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'unavailable':'AWS state read failed'}
                f.write(json.dumps(record)+'\n');f.flush();stop.wait(10)
    thread=threading.Thread(target=sample);thread.start()
    env=os.environ.copy()
    env.update(BASE_URL=args.url,RATE=str(args.rate),DURATION=args.duration,ITERATIONS=str(args.iterations),TARGET='compute',RESULT_FILE='/scripts/results/'+ident+'.k6.json')
    command=['docker','run','--rm','--user',f'{os.getuid()}:{os.getgid()}','-v',str(Path(__file__).parent)+':/scripts']
    if args.allow_ssm_tunnel and args.url.startswith('http://'):
        command+=['--network','host']
    for key in ['BASE_URL','RATE','DURATION','ITERATIONS','TARGET','RESULT_FILE','LOAD_TEST_TOKEN']:command+=['-e',key]
    command+=['grafana/k6:1.3.0','run','/scripts/scenarios/'+args.scenario+'.js']
    try:
        with prefix.with_suffix('.log').open('w') as output:
            result=subprocess.run(command,env=env,stdout=output,stderr=subprocess.STDOUT)
    finally:stop.set();thread.join(timeout=20)
    activities=aws('autoscaling','describe-scaling-activities','--auto-scaling-group-name',args.asg,'--max-records','100')
    prefix.with_suffix('.activities.json').write_text(json.dumps(activities,indent=2)+'\n')
    raw=prefix.with_suffix('.k6.json')
    if not raw.exists():raise RuntimeError('k6 did not write a summary; inspect the saved log')
    metrics=json.loads(raw.read_text());m=metrics['metrics'];v=lambda key,stat:m.get(key,{}).get('values',{}).get(stat)
    data={'id':ident,'environment':'AWS','timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scenario':args.scenario,'experimentMode':args.mode,'replicas':replicas if args.mode=='fixed' else None,'rate':args.rate,'iterations':args.iterations,'configuredDuration':args.duration,'durationSeconds':metrics['state']['testRunDurationMs']/1000,'totalRequests':v('http_reqs','count'),'successfulRequests':v('http_req_failed','fails'),'failedRequests':v('http_req_failed','passes'),'throughput':v('http_reqs','rate'),'averageMs':v('http_req_duration','avg'),'p50Ms':v('http_req_duration','med'),'p95Ms':v('http_req_duration','p(95)'),'failureRate':v('http_req_failed','rate'),'droppedIterations':v('dropped_iterations','count') or 0,'cpu':None,'memoryBytes':None,'k6ExitCode':result.returncode,'thresholdsPassed':result.returncode==0,'valid':bool(v('http_reqs','count')),'limitations':'AWS state timeline and scaling activities stored alongside k6. CPU/memory must be exported from CloudWatch; changing-capacity runs are not fixed-capacity comparisons.'}
    prefix.with_suffix('.summary.json').write_text(json.dumps(data,indent=2)+'\n')
    import csv
    with prefix.with_suffix('.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=data);writer.writeheader();writer.writerow(data)
    print('Saved',prefix.name,'k6 exit',result.returncode)
    if result.returncode:raise RuntimeError('k6 thresholds failed; measurements preserved')

@contextmanager
def fixed_configuration():
    initial=state()
    if initial['maximum']>3:raise RuntimeError('Refusing an ASG with maximum above 3')
    if aws('autoscaling','describe-scheduled-actions','--auto-scaling-group-name',args.asg).get('ScheduledUpdateGroupActions'):
        raise RuntimeError('Fixed mode requires an ASG without scheduled scaling actions')
    group=aws('autoscaling','describe-auto-scaling-groups','--auto-scaling-group-names',args.asg)['AutoScalingGroups'][0]
    already_suspended=any(p['ProcessName']=='AlarmNotification' for p in group.get('SuspendedProcesses',[]))
    suspended=False
    try:
        if not already_suspended:
            aws('autoscaling','suspend-processes','--auto-scaling-group-name',args.asg,'--scaling-processes','AlarmNotification');suspended=True
        yield
    finally:
        try:
            aws('autoscaling','update-auto-scaling-group','--auto-scaling-group-name',args.asg,'--min-size',str(initial['minimum']),'--max-size',str(initial['maximum']),'--desired-capacity',str(initial['desired']))
        finally:
            if suspended:aws('autoscaling','resume-processes','--auto-scaling-group-name',args.asg,'--scaling-processes','AlarmNotification')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--region',required=True);parser.add_argument('--asg',required=True);parser.add_argument('--target-group',required=True);parser.add_argument('--url',required=True)
    parser.add_argument('--mode',choices=['fixed','observe'],default='observe');parser.add_argument('--allow-capacity-changes',action='store_true')
    parser.add_argument('--allow-ssm-tunnel',action='store_true',help='Allow HTTP only on a literal loopback address with an explicit port; use an active SSM tunnel')
    parser.add_argument('--scenario',choices=['baseline','compute','ramp-up','sustained','recovery'],default='compute')
    parser.add_argument('--rate',type=int,default=1);parser.add_argument('--duration',default='10s');parser.add_argument('--iterations',type=int,default=10000);parser.add_argument('--ready-timeout',type=int,default=900)
    args=parser.parse_args()
    if not valid_url(args.url,args.allow_ssm_tunnel) or args.rate<1 or not 10000<=args.iterations<=5000000:parser.error('Use HTTPS or explicitly allow a loopback SSM tunnel, positive rate and bounded compute iterations')
    if not os.environ.get('LOAD_TEST_TOKEN'):parser.error('Set LOAD_TEST_TOKEN privately in the shell')
    if os.name=='nt':parser.error('Run this script in WSL, not Windows Python')
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    if args.mode=='fixed':
        if not args.allow_capacity_changes:parser.error('Fixed mode requires --allow-capacity-changes')
        with fixed_configuration():
            for count in [1,2,3]:
                aws('autoscaling','update-auto-scaling-group','--auto-scaling-group-name',args.asg,'--min-size',str(count),'--max-size',str(count),'--desired-capacity',str(count))
                wait_capacity(count);run_test(count)
    else:run_test(state()['inService'])
