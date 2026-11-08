# AWS deployment readiness

Application and AWS deployment code are implemented locally. AWS has not been
provisioned, images have not been pushed, and live AWS behavior is not verified.
Follow [AWS_MANUAL_SETUP.md](AWS_MANUAL_SETUP.md) in order.

| Component | Implemented | Still requires manual AWS verification |
|---|---|---|
| Application | Storefront, Supabase API, liveness/readiness, protected compute, graceful shutdown | EC2 connectivity and verified database TLS |
| Monitoring | SDK v3 EC2/ASG/ALB/CloudWatch adapter with offline tests | IAM permissions, real metrics and scaling events |
| Infrastructure | Terraform VPC/subnets/SGs/ALB/EC2/ASG 1-3/50% CPU policy/IAM/logging | Account constraints, reviewed plan and manual apply |
| Startup | systemd, ECR digest pulls, runtime SSM secrets, CloudWatch agent | First boot, CA, profile and secret schemas |
| Dashboard | AWS/local labels, desired/InService/healthy counts, protected AWS routing | HTTPS hostname/certificate and actual AWS data |
| Experiments | AWS fixed/observe runner, restoration tests, timelines and JSON/CSV | Approved pilot, scale-out/in and report evidence |
| Release | Clean-source ECR publisher, immutable tags, digest manifest, secret audit | Git review/commit/push, ECR scans and publishing |

Deployment requires a controlled hostname and ACM certificate, permitted x86-64
instances in two AZs, a budget, approved IAM access and existing Supabase credentials.
The supplied cost-conscious design uses public subnets/public IPv4 with app ingress
restricted to ALB; it does not claim private-subnet isolation. No Docker socket is
mounted on AWS. Base image tags are mutable; deployed application images are pinned
to digests. AWS memory requires CWAgent, and per-instance request counts remain
unavailable. CloudWatch target response time differs from k6 client latency.

Verified database TLS is the default and AWS refuses insecure TLS. Local Compose
explicitly defaults LOCAL_DB_TLS_VERIFY=false for compatibility; configure a proper
CA and set it true to verify locally. No seed/migration is run. `/api/ready` checks
DB connectivity; `/api/health` remains liveness so a database outage does not cause
continuous EC2 replacement. See [COMPLETION_STATUS.md](COMPLETION_STATUS.md) for
checks actually run. Mock validation is not live deployment evidence.
