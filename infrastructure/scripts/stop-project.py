#!/usr/bin/env python3
"""
Stops and terminates running AWS EC2 instances and locks the backend ASG to 0
to completely prevent automatic restarts and compute charges.
"""

import json
import os
import subprocess
import sys

PROFILE = os.environ.get('AWS_PROFILE', 'it457-login')
REGION = 'ap-south-1'
ASG_NAME = 'bbd-it457-backend'
PROJECT = 'bbd-it457'

def aws(*args):
    result = subprocess.run(
        ['aws', *args, '--profile', PROFILE, '--region', REGION, '--output', 'json'],
        capture_output=True, text=True, check=True
    )
    return json.loads(result.stdout or '{}')

def main():
    print("=" * 70)
    print("STOPPING & LOCKING ALL AWS EC2 INSTANCES TO 0")
    print("=" * 70, flush=True)

    # 1. Lock Auto Scaling Group to 0 so it NEVER starts an instance automatically
    print(f"\n1. Locking Auto Scaling Group '{ASG_NAME}' to 0 capacity...")
    subprocess.run([
        'aws', 'autoscaling', 'update-auto-scaling-group',
        '--profile', PROFILE, '--region', REGION,
        '--auto-scaling-group-name', ASG_NAME,
        '--min-size', '0', '--max-size', '0', '--desired-capacity', '0'
    ], check=True)
    print("   [OK] ASG locked (Min: 0, Max: 0, Desired: 0). No automatic launches can happen.")

    # 2. Terminate any active or pending instances belonging to the project
    print("\n2. Scanning for any running or pending EC2 instances...")
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

    if running_ids:
        print(f"   Terminating instances: {', '.join(running_ids)}...")
        term = aws('ec2', 'terminate-instances', '--instance-ids', *running_ids)
        for t in term.get('TerminatingInstances', []):
            print(f"   - {t['InstanceId']}: {t['CurrentState']['Name']}")
    else:
        print("   [OK] Zero running or pending instances found.")

    print("\n" + "=" * 70)
    print("SUCCESS: All EC2 instances are terminated/stopped and ASG is locked to 0.")
    print("No instances will automatically restart.")
    print("Note: Terminated instances remain visible in AWS Console for ~1-2 hours")
    print("with state 'terminated' before AWS automatically purges them.")
    print("=" * 70)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
