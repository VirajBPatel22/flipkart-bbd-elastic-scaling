# AWS manual setup: from local checkout to the IT457 demonstration

**No domain?** Use [the domain-free ALB demo runbook](ALB_DEMO_SETUP.md).
It uses HTTP for the public storefront and SSM tunnels for dashboard/compute.
The HTTPS/DNS instructions below apply to the original domain-based mode.

This is the main deployment runbook. The repository supplies the code; **you** run
the account-specific steps below. No AWS deployment, registry push, commit or cloud
experiment has been executed by the coding assistant. Mocked tests do not prove
your account permissions or live infrastructure work.

## 0. What is being deployed

- Existing React storefront on one EC2 instance.
- Existing Node.js backend on an EC2 Auto Scaling Group: min 1, max 3.
- Dashboard and AWS monitoring API together on one EC2 instance.
- HTTPS Application Load Balancer, three target groups and path rules.
- Existing external Supabase PostgreSQL; no migration/reset/seed required.
- CloudWatch metrics/logs and Systems Manager for access; no inbound SSH.
- Private ECR repositories with immutable source-version tags; EC2 uses image digests.

Use the later Week 2 scope of 1-3 backend instances, superseding Week 1's 1-5.
The total fleet starts at **three EC2 instances** and can reach **five** (frontend,
dashboard and up to three backends). Instance replacement during updates can reduce
availability at capacity one. This is a teaching environment, not an HA production store.

To avoid NAT Gateway costs, the supplied network uses two public subnets in two
Availability Zones. App instances have public IPv4 addresses for outbound downloads,
SSM, ECR and Supabase. Their security groups accept application traffic **only from
the ALB security group**. They do not accept Internet SSH or direct API traffic.
Public IPv4 addresses still incur charges. A private-subnet/NAT/endpoints design is
a separate architecture choice; do not claim the supplied app subnets are private.

## 1. Verify the local milestone first

On Windows PowerShell in the existing checkout:

```powershell
cd C:\Users\okpat\Desktop\flipkart-bbd-elastic-scaling
npm test --prefix backend
npm test --prefix dashboard/monitoring-api
npm run build:frontend
npm run build:dashboard-frontend
python -m unittest discover -s infrastructure/tests -p test_*.py
python infrastructure/scripts/check-release.py
```

In a WSL Ubuntu terminal:

```bash
cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling
docker compose up --build -d
python3 infrastructure/scripts/verify-local.py
bash infrastructure/scripts/validate-local.sh
```

Open http://localhost:8081/ and http://localhost:8081/dashboard/. Keep the WSL
terminal open while demonstrating locally. Validation uses Docker to run Terraform
1.13.5; it installs provider plugins locally and runs mock-provider tests, not apply.
Do not run Windows native node_modules through WSL Node. Docker builds install
their own Linux dependencies.

## 2. Review and commit the source, then push when you are ready

This checkout contains substantial pre-existing untracked work. Inspect it before
staging; do not assume every untracked file was created in the latest session.

```bash
git status --short
git branch --show-current
python3 infrastructure/scripts/check-release.py
git diff --check
```

The current development branch is `ompatel/full-project-aws-setup`. Review the
application, infrastructure, docs, lockfiles and tests. Stage intended paths only.
An example after reviewing those paths:

```bash
git add README.md .gitignore .env.example package.json package-lock.json \
  backend frontend dashboard database infrastructure load-tests docs
git diff --cached --stat
git diff --cached --check
# Privately review the staged diff for secrets before committing.
git commit -m "Complete local demo and prepare AWS deployment"
git push -u origin ompatel/full-project-aws-setup
```

Do not force-add ignored files. In particular, exclude backend/.env, AWS credentials,
certificates/private keys, Terraform state/plans, release configs and raw local
results. The scanner is a useful check, not a guarantee that every possible secret
is recognized. The image publisher requires a clean reviewed Git working tree.

## 3. Choose the AWS account and region manually

Use AWS Academy Learner Lab if that is your course requirement. Start the lab and
check the remaining budget/session expiration. Otherwise use your regular account
with your normal SSO/approved role. Avoid root credentials and permanent access
keys for this project.

Before spending anything, verify:

1. The instructor allows EC2, ALB, ASG, ECR, SSM and CloudWatch in your selected region.
2. At least two Availability Zones and enough vCPU quota are available.
3. The selected x86-64 instance type (default t3.micro) is allowed. If the lab
   permits only t2.micro, set that value. Do not choose ARM/t4g with these amd64 images.
4. You may create IAM roles, or an instructor-approved existing instance profile
   has the required permissions. A role name is not necessarily a profile name.
5. Your expected running time and maximum five-instance fleet fit the budget.

Create a budget alert in Billing/Budgets if your account permits it. It does not
stop resources automatically. Review the cost estimate in step 8 before applying.

## 4. Install/configure the operator tools in WSL

You need Docker Engine, Python3, OpenSSL, AWS CLI v2 and (for interactive SSM)
the Session Manager plugin. Use the vendors' official installation instructions.
Terraform runs through the Docker helper below. Its provider cache uses a Docker
volume for speed; source, lockfile and local state remain in the existing checkout.

For an SSO account, configure the approved profile:

```bash
aws configure sso --profile it457
aws sso login --profile it457
export AWS_PROFILE=it457
export AWS_REGION=ap-south-1
aws sts get-caller-identity
bash infrastructure/scripts/aws-preflight.sh
```

For Learner Lab, use the lab-provided temporary credentials in the AWS CLI's own
credentials/config files outside this repository. Include its session token; refresh
all three temporary fields when they expire. Run the preflight again after refresh.
Do not paste credentials into React, tfvars, source files, GitHub or this chat.

## 5. Obtain a hostname and HTTPS certificate

This prepared deployment requires a DNS hostname and an issued ACM certificate.
For example, use a subdomain you already control or one supplied by your institution.
Buying a domain is not necessary if a suitable subdomain is available.

1. Open **AWS Certificate Manager** in the same region as the future ALB.
2. Request a public certificate for your chosen hostname, e.g. `bbd.your-domain.edu`.
3. Choose DNS validation and add its validation record at your DNS provider.
4. Wait for **Issued** and record the certificate ARN.

An ALB-generated `*.elb.amazonaws.com` hostname is not a domain you control and
cannot be used as your ACM validation hostname. If you have no hostname, resolve
that with your instructor before this HTTPS deployment. Do not bypass browser
certificate errors or send dashboard/compute secrets over plain HTTP.

## 6. Publish four container images (manual AWS write)

From the clean committed checkout, with the intended profile/region selected:

```bash
export AWS_REGION=ap-south-1
CONFIRM_AWS_WRITES=yes bash infrastructure/scripts/publish-images.sh
```

This explicitly creates missing `bbd/frontend`, `bbd/backend`, `bbd/dashboard` and
`bbd/monitoring` ECR repositories, builds amd64 images, pushes Git-SHA version tags,
and writes a local release manifest under `infrastructure/releases/` containing
the pushed digests. It does not create EC2/ALB resources. Review ECR scan results.
Repository names are dedicated to this project; do not reuse unrelated repositories.

Record the printed manifest path. Use it unchanged for plan/apply/destroy.
If a partial push failed, existing immutable tags cannot be overwritten. Inspect
the already-pushed image and resolve the release deliberately; do not delete or
replace unrelated images. A subsequent source commit gives a new release tag.

## 7. Prepare runtime secrets in SSM Parameter Store

The application retrieves secrets at EC2 boot. They are not in Terraform variables,
state or EC2 user-data. The helper prompts privately and passes the value through a
permission-restricted temporary file, then removes it. Run it in WSL, not Windows.

For the database, use a dedicated read-only role for the products table where
available. Verify its grants in Supabase; direct postgres/owner access can bypass
RLS, so do not rely on RLS alone to protect an owner connection. Do not reset the
existing database. For IPv4 connectivity, use the supported Supabase session-pooler
connection string. Passwords in URLs must be URL-encoded where necessary.

```bash
python3 infrastructure/scripts/configure-aws-secrets.py backend \
  --region "$AWS_REGION" --name /it457/bbd/backend
python3 infrastructure/scripts/configure-aws-secrets.py dashboard \
  --region "$AWS_REGION" --name /it457/bbd/dashboard
```

The backend prompt requests your existing database URL and a private compute token
of at least 32 characters. Generate/store the token in your password manager. The
dashboard prompt requires a username and password of at least 16 characters; it
stores a salted password hash rather than the plaintext password.

If Supabase requires a CA certificate beyond the runtime system trust store,
download the correct CA from the official project/provider settings, verify it,
and pass `--ca-file /path/to/provider-ca.pem` to the backend helper. The value is
base64-encoded in the SecureString. AWS mode refuses unverified database TLS.
Do not use `rejectUnauthorized=false` as an AWS workaround.

The helper asks you to type WRITE before each account change. Existing parameters
are not overwritten unless you explicitly add `--overwrite`. Secret rotation takes
effect when `bbd.service` restarts on the affected instances (or instances refresh).

## 8. Configure Terraform and review costs

```bash
cd infrastructure/terraform
cp -n example.tfvars terraform.tfvars
```

Edit terraform.tfvars privately:

- Region and permitted x86-64 instance type.
- Your issued certificate ARN and public hostname.
- `allowed_cidrs`: start with your team's actual public IPv4 `/32` addresses.
  The example `203.0.113.10/32` is documentation-only and will block you.
- Secret parameter names matching step 7.
- Leave `enable_compute=false` until a controlled test window.
- Remove the example `images` block; images come from the release manifest.

For restricted Learner Labs:

```hcl
create_iam = false
existing_instance_profile = "YOUR_APPROVED_INSTANCE_PROFILE"
```

Ask your instructor to verify the profile's EC2 trust, ECR pull, SSM managed-node
access, parameter read/decryption, log write, CWAgent publishing and dashboard AWS
read permissions. Do not assume `LabInstanceProfile` exists or is sufficient.
Normal-account mode creates three application roles with the policies in iam.tf.

Costs to estimate at current regional rates: 3-5 EC2 instances, their EBS disks,
public IPv4, ALB time/LCU, ECR storage/scanning, CloudWatch logs/custom metrics,
data transfer and any domain/hosted-zone charges you choose. No NAT Gateway is
created by this configuration. Use the AWS Pricing Calculator and your lab budget;
no fixed monetary estimate in this guide is a promise about your account.

## 9. Initialize and inspect the real AWS plan

From the **repository root**, define a function for Terraform in Docker. It mounts
the AWS CLI configuration read-only and passes standard profile/region variables:

```bash
cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling
tf() {
  docker run --rm -it \
    -e AWS_PROFILE -e AWS_REGION -e TF_DATA_DIR=/terraform-data \
    -v bbd-it457-terraform-data:/terraform-data \
    -v "$HOME/.aws:/root/.aws:ro" \
    -v "$PWD:/workspace" -w /workspace/infrastructure/terraform \
    hashicorp/terraform:1.13.5 "$@"
}
export RELEASE=$(realpath infrastructure/releases/YOUR_COMMIT-images.tfvars.json)
export RELEASE_IN_CONTAINER="/workspace/${RELEASE#"$PWD/"}"
tf init
tf validate
tf plan -var-file="$RELEASE_IN_CONTAINER" -out=deployment.tfplan
```

Replace YOUR_COMMIT with the actual generated manifest filename. Keep the release
under this checkout so the container mount can read it. For env-based lab credentials,
add `-e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN` to the helper
instead of placing their values in command text. SSO token caches must be current.

Read the plan: it should be this project's VPC/subnets/SGs, ALB/listeners/target
groups, launch template/ASG/policy, two standalone instances, log group, and IAM
resources only when create_iam=true. **Stop if it touches unrelated resources.**
The plan performs AWS reads; unlike offline validation, it needs account permissions.

## 10. Apply manually and create the DNS record

Only after reviewing the plan and cost:

```bash
tf apply deployment.tfplan
tf output
```

No `-auto-approve` is required. Allow time for EC2 packages/images and health checks.
Create a DNS alias/CNAME for your hostname pointing to `alb_dns_name` from outputs.
For a Route 53 subdomain, create an A alias to the ALB. For external DNS, use the
provider-supported CNAME for the subdomain. Keep the ACM validation record.

## 11. Verify deployment before generating load

```bash
export PUBLIC_URL=https://YOUR_HOSTNAME
curl -f "$PUBLIC_URL/api/health"
curl -f "$PUBLIC_URL/api/products"
curl -f "$PUBLIC_URL/api/instance"
```

Check the storefront in a browser. Open `$PUBLIC_URL/dashboard/` and enter the
dashboard credentials from step 7. Refresh the page and confirm JS/CSS still load.
The dashboard should display AWS (not LOCAL_DOCKER), real instance IDs, desired/
InService/healthy counts, AWS scaling activities and timestamped CloudWatch data.
Memory requires successful CloudWatch agent publishing; missing data remains
Unavailable. CloudWatch is delayed and idle metrics can be absent. Per-instance
request distribution is intentionally unavailable, not assumed to be even.

AWS Console checks:

1. **EC2 > Target Groups:** all three groups have the expected healthy targets.
2. **EC2 > Auto Scaling Groups:** min 1, max 3, desired initially 1, target tracking 50%.
3. **Systems Manager > Fleet Manager/Session Manager:** all instances are managed.
4. **CloudWatch > Log groups:** application logs appear under `/it457/PROJECT`.
5. **CloudWatch > Metrics:** EC2 CPU and CWAgent memory appear after publication.

Dashboard credentials protect the dashboard and monitoring API through Nginx. App
ports accept inbound traffic only from the ALB. Keep the ALB CIDR allowlist current.
The ALB URL alone is not proof that automatic scaling or monitoring works.

## 12. Run controlled AWS experiments

First enable compute deliberately: set `enable_compute=true`, run a new plan/apply
with the same release manifest, and wait for the backend instance refresh and
healthy targets. An image/config update at capacity one can interrupt service;
perform updates before the demonstration, not during measurements.

Set these values from Terraform outputs:

```bash
export ASG_NAME=YOUR_ASG_NAME
export TARGET_GROUP_ARN=YOUR_BACKEND_TARGET_GROUP_ARN
read -rsp 'Compute token: ' LOAD_TEST_TOKEN; echo
export LOAD_TEST_TOKEN
```

A short **observe-mode smoke test** does not change ASG settings:

```bash
python3 load-tests/run-aws-experiments.py \
  --region "$AWS_REGION" --asg "$ASG_NAME" --target-group "$TARGET_GROUP_ARN" \
  --url "$PUBLIC_URL" --mode observe --rate 1 --duration 10s --iterations 10000
```

For fixed-capacity E1 (this deliberately changes the dedicated ASG temporarily):

```bash
python3 load-tests/run-aws-experiments.py \
  --region "$AWS_REGION" --asg "$ASG_NAME" --target-group "$TARGET_GROUP_ARN" \
  --url "$PUBLIC_URL" --mode fixed --allow-capacity-changes \
  --rate 1 --duration 10s --iterations 10000
```

The runner preserves original ASG min/max/desired settings and AlarmNotification
suspension state and restores them in normal exception/exit handling. It cannot
restore after SIGKILL, power loss or expired credentials; verify in the console.
Use only this project's ASG, with no scheduled scaling actions. Desired count alone
is insufficient: the runner waits for InService **and** healthy targets.

For E2, first obtain approval for the longer traffic window and budget. Calibrate
RATE, ITERATIONS and duration on your actual instance type with a short pilot, then
run observe mode with `--scenario recovery` or `ramp-up` for the approved period.
Observe mode leaves target tracking active. Do not copy an arbitrary large request
rate from a report or treat the default 10-second smoke as a scale-out experiment.
Scaling depends on CPU history, warm-up and metric publication and may take minutes.

Keep k6 logs, `.k6.json`, `.summary.json`, CSV, `.aws.jsonl` instance/target timelines
and `.activities.json`. Export matching CPU/memory/request metric intervals from
CloudWatch after publication; summary CPU/memory remain null until measured data
is available, rather than assigning unrelated delayed samples to the run. Record
region, instance type, image digest, test settings, start/end and generator dropped
iterations. Graph p95 vs fixed capacity and load/CPU/capacity vs time separately.

The optional E3 failure/replacement test is a separate explicit console action on
your own dedicated instance; it is never automatically triggered by the runner.
Record the instance ID and timestamps, observe ALB health and ASG replacement, and
preserve failures rather than discarding inconvenient runs.

To show selected AWS run summaries on the deployed dashboard:

```bash
python3 infrastructure/scripts/upload-results.py --region "$AWS_REGION" \
  --instance YOUR_DASHBOARD_INSTANCE_ID load-tests/results/YOUR_RUN.summary.json
```

Verify the returned SSM command in **Systems Manager > Run Command** before refreshing.
The dashboard's `/opt/bbd/results` folder persists on that instance across container
restarts, but not EC2 replacement. Keep the original results on your laptop; export
before updates/destroy. Do not store every request in Supabase.

When tests finish, disable compute via plan/apply, unset LOAD_TEST_TOKEN, restore
ASG baseline and verify health. Save the live URL, ASG activity screenshots,
CloudWatch plots, result graphs, cost notes and architecture for the IT457 report.

## 13. Troubleshoot without resetting the database

Use Systems Manager to connect to the affected EC2 instance:

```bash
aws ssm start-session --region "$AWS_REGION" --target INSTANCE_ID
sudo systemctl status bbd.service --no-pager
sudo journalctl -u bbd.service --no-pager -n 50
sudo docker ps
```

- Startup fails: check IAM profile, SSM names/schema, ECR digest and outbound access.
  The startup helper suppresses raw secret-bearing command errors in logs.
- Unhealthy targets: check correct port/path, container state and SG source ALB.
- Products fail while health passes: check CA/hostname verification, database role,
  URL encoding, Supabase connectivity and pooler URL; health is liveness only.
- AWS dashboard unavailable: check region/ASG/target group and IAM read permissions.
- Memory unavailable: check amazon-cloudwatch-agent and its CWAgent permission.
- Dashboard 401: check credentials and password hash; 401 without credentials is expected.
- Missing/old CPU or response time: check metric timestamps and wait for publication.
- No scaling: ensure compute is enabled, CPU actually rises, policy is active, max=3,
  credits/quota/capacity permit launches, and startup/target health complete.
- Never print `/opt/bbd/*.env`, SSM decrypted values, or Docker inspect Env into reports.

## 14. Stop charges and preserve evidence

Export results and screenshots first. From this checkout, use the **same** Terraform
state, tfvars and release manifest used to create the resources:

```bash
tf plan -destroy -var-file="$RELEASE_IN_CONTAINER" -out=destroy.tfplan
# Inspect every resource; confirm it belongs to this project.
tf apply destroy.tfplan
```

Do not merely stop an ASG instance: the ASG can replace it. Do not leave the ALB
running after the demo. In the console verify this project's instances/ASG/ALB,
target groups, EBS volumes and any related billable resources are gone. Terraform
does not own the manually created ECR repositories/images, SecureString parameters,
certificate or DNS records. Review and remove those project-specific resources
manually when no longer required; do not delete shared domains, roles or other work.
Deleting ECR images or SSM parameters is irreversible, so export any needed material
and check the exact names before doing so. Preserve Terraform state privately until
cleanup is confirmed; never commit it.

## Deployment completion checklist

- [ ] Local tests and Docker integration pass; reviewed source committed/pushed.
- [ ] Correct AWS account/region, budget, quotas and instance profile verified.
- [ ] Images scanned and deployed by digest; secrets fetched at boot.
- [ ] HTTPS/DNS and storefront/product API work through ALB.
- [ ] All target groups healthy; dashboard protected and displaying actual AWS data.
- [ ] E1 fixed capacities measured with matching workloads.
- [ ] E2 actual scale-out and scale-in observed with timestamps/screenshots.
- [ ] Limitations, failed runs, dropped iterations and metric delays reported.
- [ ] Evidence exported and project resources cleaned up after the demonstration.

Official references: [AWS SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started-nodejs.html),
[ALB metrics](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html),
[target tracking](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html),
[CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html).
