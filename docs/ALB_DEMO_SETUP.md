# Domain-free ALB demonstration

Use this runbook when you do not own a domain. It replaces the DNS/certificate
steps in AWS_MANUAL_SETUP.md. Existing ECR images and SSM secrets can be reused.
Only Terraform and laptop tools changed; rebuilding images is unnecessary.
The commands below are manual AWS actions, not actions performed by the assistant.

## 1. Confirm the starting point

Open WSL Ubuntu and work from the repository root:

```bash
cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling
export AWS_REGION=ap-south-1
unset AWS_PROFILE AWS_DEFAULT_PROFILE
refresh_aws_credentials
aws sts get-caller-identity
test -s infrastructure/releases/8320ae0cc697-images.tfvars.json
```

If `refresh_aws_credentials` is undefined in a new terminal, define it again:

```bash
refresh_aws_credentials() {
  local credentials
  credentials=$(aws configure export-credentials --profile it457-login --format process) || return 1
  read -r AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN < <(
    printf '%s' "$credentials" |
      python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["AccessKeyId"],d["SecretAccessKey"],d["SessionToken"])'
  ) || return 1
  export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
}
```

If login expired, run `aws login --profile it457-login --remote`, then refresh.
Verify the identity is your intended account (418295404932). Never paste credentials.
Review ECR scan findings for all four image digests before deployment. The SSM
parameter names alone do not verify their secret contents or Supabase connectivity.

## 2. Configure HTTP demo mode

Find your current public IPv4 using your browser, then write it as `x.x.x.x/32`.
Edit `infrastructure/terraform/terraform.tfvars` with these values; preserve any
other intentional settings. This file is ignored by Git.

```hcl
region = "ap-south-1"
project = "bbd-it457"
demo_http = true
allowed_cidrs = ["YOUR_PUBLIC_IPV4/32"]
enable_compute = false
backend_max_size = 2
```

No `public_hostname` or `certificate_arn` is needed. Use your actual IP, not the
documentation example CIDR. Team members need their own public IPv4 /32 entries.
Do not put image tags here: supply the release JSON file in the next step.

With two standalone t3.micro web servers, a maximum of two t3.micro backends fits
an 8-vCPU account quota. Set `backend_max_size = 3` only after confirming at least
10 vCPUs of usable quota and allowing for other running instances. This limit is
configurable; default Terraform mode retains the original maximum of three.
Use [automatic scaling verification](AUTO_SCALING_VERIFICATION.md) to test CPU
alarm-driven scaling without exposing compute tokens on the public HTTP listener.

## 3. Validate and review the AWS plan

Define this helper in the same WSL terminal. It passes temporary credentials by
environment variable name and does not print or mount your credential files.

```bash
tf() {
  docker run --rm -i \
    -e AWS_REGION -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN \
    -e TF_DATA_DIR=/terraform-data \
    -v bbd-it457-terraform-data:/terraform-data \
    -v "$PWD:/workspace" -w /workspace/infrastructure/terraform \
    hashicorp/terraform:1.13.5 "$@"
}
export RELEASE_IN_CONTAINER=/workspace/infrastructure/releases/8320ae0cc697-images.tfvars.json
tf init
tf validate
tf plan -var-file="$RELEASE_IN_CONTAINER" -out=deployment.tfplan
```

The plan should create only project resources: VPC, two public subnets, security
groups, ALB, HTTP listeners 80 and 8080, three target groups, frontend/dashboard
instances, backend launch template/ASG, CPU policy, IAM roles and CloudWatch logs.
There should be no HTTPS listener, certificate, Route 53 zone or NAT Gateway.
Port 8080 accepts only the frontend instance security group. Dashboard routes on
public port 80 return 403. Public backend routes allow GET status/products only.

The fleet begins at three EC2 instances and can reach five. ALB, EC2, EBS, public
IPv4, logs, metrics and ECR can incur regular-account charges. Review the plan
and current AWS prices before applying. Stop if unrelated resources are affected.

## 4. Deploy manually

After reviewing the plan:

```bash
tf apply deployment.tfplan
tf output
```

Keep Terraform state and the release manifest; do not commit state, plans or secrets.
Allow time for boot, image downloads and target registration. In AWS Console,
select Mumbai, then EC2 > Target Groups > backend > Targets. Wait for one healthy
backend. Confirm frontend is healthy and all three instances appear Online under
Systems Manager > Fleet Manager. An apply success alone does not verify the apps.

```bash
export PUBLIC_URL=$(tf output -raw public_url)
curl -f "$PUBLIC_URL/api/health"
curl -f "$PUBLIC_URL/api/ready"
curl -f "$PUBLIC_URL/api/products"
curl -o /dev/null -s -w '%{http_code}\n' "$PUBLIC_URL/dashboard/"
curl -o /dev/null -s -w '%{http_code}\n' "$PUBLIC_URL/api/demo/compute"
```

Open the printed `public_url` with **http://**. The last two checks should return
403. Do not send passwords or load-test tokens to that public URL. Public HTTP
is unencrypted and appropriate only for the read-only demonstration.

If a target is unhealthy, inspect the project CloudWatch log group and use an SSM
shell to check `sudo systemctl status bbd` and `sudo journalctl -u bbd -n 50`.
Do not print `/opt/bbd/*.env` or decrypted SSM values. Resolve boot/DB readiness
failures before attempting load tests.

## 5. Open the dashboard through SSM

Install the Linux Session Manager plugin **inside WSL**, following the official
[Ubuntu installation instructions](https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-debian-and-ubuntu.html).
Check it with `session-manager-plugin --version`. The remote-host compute tunnel
also requires SSM Agent 3.1.1374.0 or newer on the frontend instance; verify/update
it using Systems Manager if necessary. See the official
[port-forwarding documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html).

In the terminal where `tf` is defined:

```bash
python3 infrastructure/scripts/start-aws-tunnel.py dashboard \
  --target "$(tf output -raw dashboard_instance_id)"
```

Leave it open. Visit `http://127.0.0.1:18080/dashboard/` and enter the username and
password you stored for dashboard authentication. Windows localhost forwarding
normally reaches WSL; if your Windows browser cannot connect, first verify using
`curl -I http://127.0.0.1:18080/dashboard/` inside WSL. Expect authentication (401)
before signing in. Check the dashboard shows AWS, desired 1 and healthy 1.

## 6. Enable and test compute only after health passes

Change `enable_compute = true` in terraform.tfvars. In another WSL terminal,
define the credentials/helper again, then:

```bash
tf plan -var-file="$RELEASE_IN_CONTAINER" -out=compute.tfplan
tf apply compute.tfplan
```

Wait for backend instance refresh and healthy targets. Then start the second tunnel:

```bash
python3 infrastructure/scripts/start-aws-tunnel.py compute \
  --target "$(tf output -raw frontend_instance_id)" \
  --load-balancer "$(tf output -raw load_balancer_arn)"
```

Keep it open. The helper selects the ALB private network-interface IP. It sends
requests through the frontend SSM agent to ALB port 8080, then the backend target
group. Internet transport uses SSM encryption; the hops inside the VPC use HTTP.
This is not end-to-end TLS. Restart the tunnel if the selected ALB ENI is replaced.

In a third WSL terminal, set credentials again, define `tf`, then run a small test:

```bash
read -rsp 'Existing backend load-test token: ' LOAD_TEST_TOKEN; echo
export LOAD_TEST_TOKEN
python3 load-tests/run-aws-experiments.py \
  --region ap-south-1 --asg "$(tf output -raw asg_name)" \
  --target-group "$(tf output -raw target_group_arn)" \
  --url http://127.0.0.1:18082 --allow-ssm-tunnel \
  --mode observe --rate 1 --duration 10s --iterations 10000
unset LOAD_TEST_TOKEN
```

Docker host networking is selected for the loopback tunnel. Verify the Linux Docker
engine can reach WSL's forwarded port (Docker Desktop may require enabling host
networking). Do not expose the tunnel on 0.0.0.0 as a workaround. This small test
does not prove scale-out. Tunnel throughput and frontend forwarding can limit
load; report those limits. CPU/memory evidence must come from CloudWatch.
Use AWS_MANUAL_SETUP.md's bounded fixed/observe experiment procedures after this
smoke test, retaining the tunnel URL and `--allow-ssm-tunnel` for every run.

## 7. Finish and clean up

Disable compute through a new reviewed plan/apply, stop tunnels with Ctrl+C and
save CloudWatch, target-health, scaling-activity and test evidence. When finished:

```bash
tf plan -destroy -var-file="$RELEASE_IN_CONTAINER" -out=destroy.tfplan
tf apply destroy.tfplan
```

Confirm project EC2 instances/ALB/volumes are gone. ECR repositories/images and SSM
parameters created outside Terraform remain; keep or remove them deliberately.
No AWS deployment or live scaling verification is implied by local mock tests.
