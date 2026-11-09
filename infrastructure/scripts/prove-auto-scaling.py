"""Prove target-tracking reactions using bounded synthetic host CPU load via SSM.

This is a control-plane elasticity test, not an HTTP throughput benchmark.
No desired-capacity changes occur during observation. On timeout/failure, cleanup
can restore the original desired capacity, explicitly recorded as manual cleanup.
"""
import argparse
import datetime as dt
import json
import signal
import subprocess
import time
from pathlib import Path


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def successful_alarm_activity(activities, alarm, since):
    return [a for a in activities if a.get('StatusCode') == 'Successful'
            and a.get('StartTime', '') >= since and alarm in a.get('Cause', '')]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--profile')
    p.add_argument('--region', default='ap-south-1')
    p.add_argument('--asg', required=True)
    p.add_argument('--target-group', required=True)
    p.add_argument('--load-seconds', type=int, default=360)
    p.add_argument('--observe-seconds', type=int, default=1800)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--confirm-aws-test', action='store_true')
    args = p.parse_args()
    if not args.confirm_aws_test or not 180 <= args.load_seconds <= 600 or not 1200 <= args.observe_seconds <= 2400:
        p.error('Confirm billable AWS testing; load must be 180–600 s and observation 1200–2400 s')
    args.output.mkdir(parents=True, exist_ok=False)

    def aws(*options):
        command = ['aws', *options, '--region', args.region, '--output', 'json']
        if args.profile:
            command += ['--profile', args.profile]
        r = subprocess.run(command, capture_output=True, check=True, timeout=90)
        return json.loads(r.stdout or '{}')

    def group():
        return aws('autoscaling', 'describe-auto-scaling-groups', '--auto-scaling-group-names', args.asg)['AutoScalingGroups'][0]

    def remote(instance, command):
        cid = aws('ssm', 'send-command', '--instance-ids', instance, '--document-name', 'AWS-RunShellScript',
                  '--parameters', json.dumps({'commands': [command]}))['Command']['CommandId']
        for _ in range(30):
            rows = aws('ssm', 'list-command-invocations', '--command-id', cid, '--details')['CommandInvocations']
            if rows and rows[0]['Status'] == 'Success':
                return cid
            if rows and rows[0]['Status'] in ('Failed', 'TimedOut', 'Cancelled'):
                raise RuntimeError('Remote command failed: ' + cid)
            time.sleep(2)
        raise TimeoutError('Remote command timeout: ' + cid)

    initial = group()
    if initial['DesiredCapacity'] != 1 or initial['MinSize'] != 1 or initial['MaxSize'] != 2 or len(initial['Instances']) != 1:
        raise RuntimeError('Start with exactly one backend, minimum 1, maximum 2 (quota-safe)')
    if any(x['ProcessName'] in ('AlarmNotification', 'Launch', 'Terminate') for x in initial.get('SuspendedProcesses', [])):
        raise RuntimeError('Scaling processes must be enabled')
    policies = aws('autoscaling', 'describe-policies', '--auto-scaling-group-name', args.asg)['ScalingPolicies']
    policy = next(x for x in policies if x['PolicyType'] == 'TargetTrackingScaling'
                  and x['TargetTrackingConfiguration']['PredefinedMetricSpecification']['PredefinedMetricType'] == 'ASGAverageCPUUtilization')
    if policy.get('Enabled') is False or policy['TargetTrackingConfiguration'].get('DisableScaleIn'):
        raise RuntimeError('CPU policy must enable scale-out and scale-in')
    alarms = aws('cloudwatch', 'describe-alarms', '--alarm-names', *[a['AlarmName'] for a in policy['Alarms']])['MetricAlarms']
    high = next(a['AlarmName'] for a in alarms if a['ComparisonOperator'].startswith('Greater'))
    low = next(a['AlarmName'] for a in alarms if a['ComparisonOperator'].startswith('Less'))
    instance = initial['Instances'][0]['InstanceId']
    unit = 'it457-cpu-proof-' + str(int(time.time()))
    (args.output / 'initial.json').write_text(json.dumps({'group': initial, 'policy': policy, 'alarms': alarms}, indent=2))
    # Two busy processes use both t3.micro vCPUs; the systemd unit caps runtime and
    # owns the process group, so load ends even if this observer exits or loses auth.
    code = '''import hashlib,multiprocessing,time

def burn(seconds):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  hashlib.sha256(b'it457-bounded-cpu-proof').digest()

if __name__=='__main__':
 workers=[multiprocessing.Process(target=burn,args=(SECONDS,)) for _ in range(2)]
 for worker in workers:worker.start()
 for worker in workers:worker.join()
'''.replace('SECONDS', str(args.load_seconds))
    import shlex
    start = utc()
    summary = {'start': start, 'instance': instance, 'loadSeconds': args.load_seconds,
               'workload': 'two synthetic host CPU processes; not HTTP traffic',
               'alarmHigh': high, 'alarmLow': low, 'scaleOutObserved': False, 'scaleInObserved': False,
               'healthyScaleOutObserved': False, 'manualCapacityCleanup': False}
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try:
        remote(instance, 'systemd-run --unit=' + unit + ' --property=RuntimeMaxSec=' + str(args.load_seconds + 30)
               + ' /usr/bin/python3 -c ' + shlex.quote(code))
        print('Bounded CPU load started:', instance, start, flush=True)
        end = time.monotonic() + args.observe_seconds
        previous = None
        while time.monotonic() < end:
            g = group()
            targets = aws('elbv2', 'describe-target-health', '--target-group-arn', args.target_group)['TargetHealthDescriptions']
            activities = aws('autoscaling', 'describe-scaling-activities', '--auto-scaling-group-name', args.asg, '--max-records', '100')['Activities']
            states = aws('cloudwatch', 'describe-alarms', '--alarm-names', high, low)['MetricAlarms']
            healthy = sum(t['TargetHealth']['State'] == 'healthy' for t in targets)
            record = {'time': utc(), 'desired': g['DesiredCapacity'], 'instances': g['Instances'], 'targets': targets,
                      'alarms': {a['AlarmName']: a['StateValue'] for a in states}}
            with (args.output / 'timeline.jsonl').open('a') as f:
                f.write(json.dumps(record) + '\n')
            (args.output / 'activities.json').write_text(json.dumps(activities, indent=2))
            out = successful_alarm_activity(activities, high, start)
            inward = successful_alarm_activity(activities, low, start)
            if out:
                summary['scaleOutObserved'] = True
                summary['scaleOutActivities'] = out
            if summary['scaleOutObserved'] and healthy >= 2:
                summary['healthyScaleOutObserved'] = True
                summary.setdefault('firstTwoHealthy', utc())
            if summary['healthyScaleOutObserved'] and inward and g['DesiredCapacity'] == 1 and healthy == 1 and len(g['Instances']) == 1:
                summary['scaleInObserved'] = True
                summary['scaleInActivities'] = inward
                break
            status = (g['DesiredCapacity'], len(g['Instances']), healthy, tuple(record['alarms'].values()))
            if status != previous:
                print(record['time'], 'desired/members/healthy/alarms', status, flush=True)
                previous = status
            (args.output / 'summary.json').write_text(json.dumps(summary, indent=2))
            time.sleep(20)
    finally:
        # The original instance may already have been terminated by automatic scale-in.
        members = group()['Instances']
        if any(i['InstanceId'] == instance for i in members):
            try:
                remote(instance, 'systemctl stop ' + unit + ' || true')
            except (RuntimeError, subprocess.SubprocessError, TimeoutError):
                summary['loadCleanupNote'] = 'Remote cleanup unavailable; systemd runtime bound still applies'
        g = group()
        if g['DesiredCapacity'] != initial['DesiredCapacity']:
            summary['manualCapacityCleanup'] = True
            aws('autoscaling', 'set-desired-capacity', '--auto-scaling-group-name', args.asg,
                '--desired-capacity', str(initial['DesiredCapacity']))
        summary['end'] = utc()
        summary['finalGroup'] = group()
        for name in (high, low):
            history = aws('cloudwatch', 'describe-alarm-history', '--alarm-name', name, '--start-date', start)
            (args.output / ('alarm-high-history.json' if name == high else 'alarm-low-history.json')).write_text(json.dumps(history, indent=2))
        (args.output / 'summary.json').write_text(json.dumps(summary, indent=2))
        print(json.dumps({k: summary[k] for k in ['scaleOutObserved', 'healthyScaleOutObserved', 'scaleInObserved', 'manualCapacityCleanup']}), flush=True)
    if not (summary['scaleOutObserved'] and summary['healthyScaleOutObserved'] and summary['scaleInObserved']):
        raise SystemExit('Automatic scaling proof incomplete; inspect saved evidence')


if __name__ == '__main__':
    main()
