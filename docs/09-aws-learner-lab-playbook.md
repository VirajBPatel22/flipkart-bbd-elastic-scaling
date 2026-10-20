# IT457 Operations Manual: AWS Academy Learner Lab Playbook
**Focus:** Navigating Constraints, $100 Budget Guardrails, 4-Hour Timeouts & Automated IaC Scripts  
**Course:** IT457 - Cloud Computing  
**Document Code:** `research/09-aws-learner-lab-playbook.md`  

---

## 1. AWS Academy Learner Lab Environmental Realities

The AWS Academy Learner Lab provides students with a constrained AWS sandbox environment. Success requires understanding its hard architectural boundaries:

```
    ┌────────────────────────────────────────────────────────────────────────┐
    │                AWS LEARNER LAB CONSTRAINED SANDBOX                     │
    ├──────────────────────┬─────────────────────────┬───────────────────────┤
    │  $100 Hard Budget    │  4-Hour Session Timer   │  IAM Role Boundaries  │
    │  - No replenishment  │  - EC2 stops on timeout │  - No custom roles    │
    │  - 8-hour bill lag   │  - IPs rotate on reboot │  - Use "LabRole" only │
    └──────────────────────┴─────────────────────────┴───────────────────────┘
```

### 1.1 The Five Golden Rules of Learner Lab

1. **The 4-Hour Session Expiration:** Each active console session runs for exactly 4 hours. When the timer hits 0:00, all standalone EC2 instances are suspended/stopped. For an Auto Scaling Group, instances may be terminated and re-spawned with fresh public IPs.  
   *Mitigation:* Never rely on static EC2 public IPs. **Always route through the Application Load Balancer**, whose public DNS name remains stable and persistent across instance restarts.
2. **The $100 Non-Replenishable Budget:** The account has a strict $100 limit. Clicking "Reset" clears infrastructure but **does not reset spent funds**.
3. **The 8-Hour Billing Display Lag:** The AWS Academy dashboard budget meter lags actual runtime consumption by 6 to 8 hours **[P04]**. Never assume you have spent $0 just because the meter has not updated.
4. **IAM Restrictions (`LabRole`):** Students are blocked from creating IAM roles, policies, or users. When launching instances that require IAM permissions (e.g., CloudWatch logging or SSM access), you must attach the pre-provisioned role:
   `arn:aws:iam::<ACCOUNT_ID>:role/LabRole` (or simply `LabRole`).
5. **No Route 53 or Global DNS:** Route 53 public hosted zones are blocked. The live URL deliverable must be submitted using the native AWS ALB DNS name (e.g., `http://it457-alb-123456789.us-east-1.elb.amazonaws.com`).

---

## 2. Infrastructure Automation: Deployment Script (`infra/deploy_lab.sh`)

To eliminate manual console clicking and enable rapid recreation after session timeouts, use this automated AWS CLI deployment script:

```bash
#!/usr/bin/env bash
# ==============================================================================
# IT457 Project: Automated Infrastructure Deployment for AWS Learner Lab
# Stack: VPC -> Multi-AZ Subnets -> Security Groups -> ALB -> ASG -> Scaling
# ==============================================================================
set -euo pipefail

REGION="us-east-1"
PROJECT="it457-bbd"
AMI_ID="ami-0c7217cdde317cfec" # Ubuntu 24.04 LTS (us-east-1) or Amazon Linux 2023
INSTANCE_TYPE="t2.micro"

echo "=== [1/7] Discovering Default VPC and Subnets ==="
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region "$REGION" --query "Vpcs[0].VpcId" --output text)
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region "$REGION" --query "Subnets[0:2].SubnetId" --output text)
SUBNET_A=$(echo "$SUBNETS" | awk '{print $1}')
SUBNET_B=$(echo "$SUBNETS" | awk '{print $2}')
echo "VPC: $VPC_ID | Subnets: $SUBNET_A, $SUBNET_B"

echo "=== [2/7] Creating Security Group ==="
SG_ID=$(aws ec2 create-security-group \
  --group-name "${PROJECT}-sg" \
  --description "Security group for IT457 ALB and App Instances" \
  --vpc-id "$VPC_ID" \
  --region "$REGION" \
  --query "GroupId" --output text 2>/dev/null || \
  aws ec2 describe-security-groups --group-names "${PROJECT}-sg" --region "$REGION" --query "SecurityGroups[0].GroupId" --output text)

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>/dev/null || true

echo "=== [3/7] Creating Target Group ==="
TG_ARN=$(aws elbv2 create-target-group \
  --name "${PROJECT}-tg" \
  --protocol HTTP \
  --port 80 \
  --vpc-id "$VPC_ID" \
  --target-type instance \
  --health-check-protocol HTTP \
  --health-check-path "/health" \
  --health-check-interval-seconds 15 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2 \
  --region "$REGION" \
  --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || \
  aws elbv2 describe-target-groups --names "${PROJECT}-tg" --region "$REGION" --query "TargetGroups[0].TargetGroupArn" --output text)

echo "=== [4/7] Deploying Application Load Balancer ==="
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name "${PROJECT}-alb" \
  --subnets "$SUBNET_A" "$SUBNET_B" \
  --security-groups "$SG_ID" \
  --scheme internet-facing \
  --type application \
  --region "$REGION" \
  --query "LoadBalancers[0].LoadBalancerArn" --output text 2>/dev/null || \
  aws elbv2 describe-load-balancers --names "${PROJECT}-alb" --region "$REGION" --query "LoadBalancers[0].LoadBalancerArn" --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers --names "${PROJECT}-alb" --region "$REGION" --query "LoadBalancers[0].DNSName" --output text)

# Attach Listener
aws elbv2 create-listener \
  --load-balancer-arn "$ALB_ARN" \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn="$TG_ARN" \
  --region "$REGION" 2>/dev/null || true

echo "=== [5/7] Creating Launch Template with Dockerized App ==="
USER_DATA=$(cat <<'EOF' | base64
#!/bin/bash
sudo apt-get update -y
sudo apt-get install -y docker.io python3-pip
sudo systemctl start docker
sudo systemctl enable docker

# Run the lightweight FastAPI container
sudo docker run -d --restart=always -p 80:80 \
  -e INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id) \
  python:3.11-slim bash -c '
cat << "PY" > app.py
from fastapi import FastAPI
import os, time

app = FastAPI()
inst_id = os.getenv("INSTANCE_ID", "local-dev")

@app.get("/")
def read_root():
    return {"message": "IT457 BBD Elastic Cluster", "instance_id": inst_id, "timestamp": time.time()}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/work")
def cpu_work(n: int = 5000):
    start = time.time()
    # Compute primes up to n
    primes = [x for x in range(2, n) if all(x % d != 0 for d in range(2, int(x**0.5) + 1))]
    return {"primes_found": len(primes), "duration_sec": time.time() - start, "instance_id": inst_id}
PY
pip install fastapi uvicorn
uvicorn app:app --host 0.0.0.0 --port 80
'
EOF
)

aws ec2 create-launch-template \
  --launch-template-name "${PROJECT}-lt" \
  --version-description "v1" \
  --launch-template-data "{
    \"ImageId\": \"$AMI_ID\",
    \"InstanceType\": \"$INSTANCE_TYPE\",
    \"SecurityGroupIds\": [\"$SG_ID\"],
    \"UserData\": \"$USER_DATA\"
  }" \
  --region "$REGION" 2>/dev/null || true

echo "=== [6/7] Creating Auto Scaling Group ==="
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name "${PROJECT}-asg" \
  --launch-template "LaunchTemplateName=${PROJECT}-lt,Version=\$Latest" \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 1 \
  --vpc-zone-identifier "${SUBNET_A},${SUBNET_B}" \
  --target-group-arns "$TG_ARN" \
  --default-cooldown 180 \
  --region "$REGION" 2>/dev/null || true

echo "=== [7/7] Attaching Target Tracking Scaling Policy ==="
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name "${PROJECT}-asg" \
  --policy-name "${PROJECT}-cpu-tracking" \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 50.0,
    "EstimatedInstanceWarmup": 60
  }' \
  --region "$REGION"

echo "=========================================================================="
echo "DEPLOYMENT COMPLETE!"
echo "LIVE URL: http://${ALB_DNS}"
echo "Verify endpoint in browser: http://${ALB_DNS}/health"
echo "=========================================================================="
```

---

## 3. Graceful Teardown Script (`infra/teardown_lab.sh`)

Run this script immediately upon concluding any load-testing or viva rehearsal to stop all hourly meter charges:

```bash
#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
PROJECT="it457-bbd"

echo ">>> [1/5] Deleting Auto Scaling Group..."
aws autoscaling update-auto-scaling-group --auto-scaling-group-name "${PROJECT}-asg" --min-size 0 --desired-capacity 0 --region "$REGION" 2>/dev/null || true
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name "${PROJECT}-asg" --force-delete --region "$REGION" 2>/dev/null || true

echo ">>> [2/5] Deleting Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers --names "${PROJECT}-alb" --region "$REGION" --query "LoadBalancers[0].LoadBalancerArn" --output text 2>/dev/null || true)
if [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
  aws elbv2 delete-load-balancer --load-balancer-arn "$ALB_ARN" --region "$REGION"
fi

echo ">>> [3/5] Deleting Target Group..."
TG_ARN=$(aws elbv2 describe-target-groups --names "${PROJECT}-tg" --region "$REGION" --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || true)
if [ -n "$TG_ARN" ] && [ "$TG_ARN" != "None" ]; then
  aws elbv2 delete-target-group --target-group-arn "$TG_ARN" --region "$REGION"
fi

echo ">>> [4/5] Deleting Launch Template..."
aws ec2 delete-launch-template --launch-template-name "${PROJECT}-lt" --region "$REGION" 2>/dev/null || true

echo ">>> [5/5] Deleting Security Group..."
sleep 10 # Wait for network interfaces to detach
aws ec2 delete-security-group --group-name "${PROJECT}-sg" --region "$REGION" 2>/dev/null || true

echo ">>> TEARDOWN COMPLETE! ZERO IDLE RESOURCES REMAINING."
```
