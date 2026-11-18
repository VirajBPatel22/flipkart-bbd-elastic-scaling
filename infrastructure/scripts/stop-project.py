#!/usr/bin/env python3
"""
Stops and terminates running AWS EC2 instances and locks the backend ASG to 0
to completely prevent automatic restarts and compute charges.
"""

import json
import os
import subprocess
import sys
import time

PROFILE = os.environ.get('AWS_PROFILE', 'it457-login')
REGION = 'ap-south-1'
ACCOUNT = '418295404932'
ASG_NAME = 'bbd-it457-backend'
PROJECT = 'bbd-it457'
TERMINATION_TIMEOUT = 300

def log(message):
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)

def duration(seconds):
    seconds = max(0, int(seconds))
    minutes, seconds = divmod(seconds, 60)
    return f'{minutes}m {seconds:02d}s' if minutes else f'{seconds}s'

def start_step(number, title, eta):
    log(f'[{number}/5] START {title} | typical ETA: {eta}')
    return time.monotonic()

def finish_step(number, title, started):
    log(f'[{number}/5] DONE {title} | took {duration(time.monotonic() - started)}')

def aws(*args):
    result = subprocess.run(
        ['aws', *args, '--profile', PROFILE, '--region', REGION, '--output', 'json'],
        capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout or '{}')

def main():
    print("=" * 70, flush=True)
    print("LOCKING PROJECT AUTOSCALING AND TERMINATING ACTIVE EC2 INSTANCES", flush=True)
    print("=" * 70, flush=True)

    started = start_step(1, f"verify AWS account using profile '{PROFILE}'", 'a few seconds')
    identity = aws('sts', 'get-caller-identity')
    if identity.get('Account') != ACCOUNT:
        raise RuntimeError(f"Wrong AWS account ({identity.get('Account')}); expected {ACCOUNT}. No stop actions were run.")
    log(f"Authenticated as {identity.get('Arn')}")
    finish_step(1, 'AWS account verification', started)

    started = start_step(2, f"lock Auto Scaling Group '{ASG_NAME}' at zero capacity", 'a few seconds')
    aws(
        'autoscaling', 'update-auto-scaling-group',
        '--auto-scaling-group-name', ASG_NAME,
        '--min-size', '0', '--max-size', '0', '--desired-capacity', '0'
    )
    log('ASG capacity is locked at Min: 0, Max: 0, Desired: 0.')
    finish_step(2, 'Auto Scaling lock', started)

    started = start_step(3, 'find project instances in running or pending state', 'a few seconds')
    res = aws(
        'ec2', 'describe-instances',
        '--filters',
        f'Name=tag:Project,Values={PROJECT}',
        'Name=instance-state-name,Values=running,pending'
    )

    running_ids = []
    for r in res.get('Reservations', []):
        for inst in r.get('Instances', []):
            running_ids.append(inst['InstanceId'])
    log(f"Found {len(running_ids)} running or pending project instance(s).")
    finish_step(3, 'active instance discovery', started)

    started = start_step(4, 'request termination for discovered active instances', 'a few seconds')
    if running_ids:
        log(f"Requesting termination for: {', '.join(running_ids)}")
        term = aws('ec2', 'terminate-instances', '--instance-ids', *running_ids)
        for t in term.get('TerminatingInstances', []):
            log(f"{t['InstanceId']}: {t['CurrentState']['Name']}")
    else:
        log('No running or pending instances need termination.')
    finish_step(4, 'termination request', started)

    if running_ids:
        started = start_step(5, 'wait for EC2 termination to complete', 'typically 30 seconds–2 minutes; maximum wait 5 minutes')
        deadline = time.monotonic() + TERMINATION_TIMEOUT
        last_report = -20
        while True:
            result = aws('ec2', 'describe-instances', '--instance-ids', *running_ids)
            states = {
                instance['InstanceId']: instance['State']['Name']
                for reservation in result.get('Reservations', [])
                for instance in reservation.get('Instances', [])
            }
            unfinished = {instance_id: states.get(instance_id, 'not returned') for instance_id in running_ids
                          if states.get(instance_id) != 'terminated'}
            elapsed = time.monotonic() - started
            if not unfinished:
                for instance_id in running_ids:
                    log(f'{instance_id}: terminated and verified')
                finish_step(5, 'EC2 termination verification', started)
                break
            if elapsed >= TERMINATION_TIMEOUT:
                raise TimeoutError(f"Termination was not verified within 5 minutes: {unfinished}")
            if elapsed - last_report >= 20:
                states_text = ', '.join(f'{instance_id}={state}' for instance_id, state in unfinished.items())
                log(f"Termination in progress | elapsed {duration(elapsed)} | {states_text} | wait limit remaining: {duration(TERMINATION_TIMEOUT - elapsed)}")
                last_report = elapsed
            time.sleep(10)
    else:
        started = start_step(5, 'verify active instance shutdown', 'immediate; no active instances were found')
        log('No running or pending instances remain to verify.')
        finish_step(5, 'active instance shutdown verification', started)

    print("\n" + "=" * 70, flush=True)
    print("COMPLETE: Auto Scaling is locked at zero and discovered active instances are terminated.", flush=True)
    print("Stopped EC2 instances are not terminated by this script; they do not incur instance compute charges.", flush=True)
    print("Terminated instances can remain visible in the AWS Console for a while.", flush=True)
    print("=" * 70, flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
