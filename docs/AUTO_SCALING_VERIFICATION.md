# CPU-triggered Auto Scaling verification

This runbook tests the existing 50% CPU target-tracking policy. It uses bounded
synthetic host CPU load through SSM, independently of the HTTP/k6 comparison.
It does not claim user traffic, database throughput or linear application scaling.

## Preconditions

- Live backend ASG with one healthy member, minimum 1 and maximum 2.
- Two standalone t3.micro web instances plus two backends fit an 8-vCPU quota.
  The original maximum 3 requires at least 10 vCPUs available for that fleet.
- CPU target tracking enabled, scale-in enabled, AlarmNotification/Launch/Terminate
  processes active. Do not change the AWS-managed alarm evaluation settings.
- AWS CLI authenticated with permission to read EC2/ASG/CloudWatch, send SSM
  commands and restore ASG desired capacity if a bounded test fails.
- A normal idle baseline and no scheduled/manual scaling actions during the test.

In Terraform, set `backend_max_size = 2` in your ignored terraform.tfvars and
review/apply the plan before starting. Keep `enable_compute = false`.

## Run from WSL

From the repository root, use current Terraform outputs for the ASG and target
group. Replace the example placeholders; the output directory must be new.

```bash
python3 infrastructure/scripts/prove-auto-scaling.py \
  --profile it457-login --region ap-south-1 \
  --asg YOUR_BACKEND_ASG --target-group YOUR_BACKEND_TARGET_GROUP_ARN \
  --load-seconds 360 --observe-seconds 1800 \
  --output infrastructure/validation/automatic-scaling-NEW_RUN \
  --confirm-aws-test
```

This is a billable cloud test. Two busy Python processes run on the initial
backend for six minutes. A transient systemd unit owns their process group and
caps runtime at load duration plus 30 seconds, even if the laptop disconnects.
No public compute endpoint, database credentials or load-test token is involved.

The observer does not set desired capacity while measuring. It records ASG state,
healthy targets, alarm state and activities every 20 seconds. Normal scale-in is
slower: this deployment's low alarm requires fifteen one-minute samples and its
threshold is 35%; the high alarm requires three samples above 50%. Allow the full
observation window. CPU-credit state and metric delivery can affect timing.

## Required proof

The result is successful only when the saved activities include completed
alarm-triggered scale-out and scale-in after test start, at least two healthy
targets were observed, and capacity returned to one healthy member. Activity
causes must name the existing high/low policy alarms. Old events, failed launches
and manual capacity changes are excluded by the attribution checks.

Artifacts include initial configuration, timeline JSONL, complete scaling
activities, alarm histories and summary flags. A nonzero exit means proof is
incomplete. Never relabel a manual cleanup action as automatic scale-in.

On timeout/failure, the script stops the CPU unit when its instance still exists
and restores original desired capacity if needed; `manualCapacityCleanup` records
that intervention. The systemd limit remains the independent load safety bound.
If credentials expire, refresh login and inspect/restore capacity explicitly.

After completion verify the public `/api/ready`, one healthy target, normal ASG
bounds, no suspended scaling processes and compute disabled. Keep the deployment
running only for the required demonstration window.
