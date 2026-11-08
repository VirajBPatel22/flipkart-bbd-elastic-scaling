# Completion status - 8 November 2026

## Current milestone

Local application and AWS deployment preparation code are complete for the agreed
IT457 proof of concept. The local stack is running. AWS deployment and live cloud
validation are still manual and have not been performed. This verification snapshot was prepared before the first release commit;
check Git history and GitHub for the current commit/push state. Current branch: `ompatel/full-project-aws-setup`.

## Implemented

- Preserved the storefront, Supabase-backed API and working local Docker system.
- Added AWS SDK v3 monitoring adapters for EC2, ASG, target health and CloudWatch.
- Added AWS/local dashboard labels, separate desired/InService/healthy counts,
  metric timestamps and explicit unavailable values.
- Added verified database TLS configuration and a sanitized `/api/ready` endpoint.
  Local Compose retains its documented explicit insecure-TLS compatibility override;
  AWS refuses that override and requires proper CA verification.
- Added Terraform networking, ALB HTTPS/path routing, frontend/dashboard EC2,
  backend ASG 1-3, CPU target tracking, IAM/lab-profile mode and log retention.
- Added automatic EC2 startup with digest-pinned ECR images and runtime SSM secrets.
- Added authenticated AWS dashboard Nginx and CloudWatch memory-agent configuration.
- Added manual ECR publishing, secret configuration, account preflight, result upload,
  release-candidate audit and AWS experiment scripts.
- Added GitHub validation workflow; it has not run on GitHub because source is not pushed.
- Added a complete operator runbook: [AWS_MANUAL_SETUP.md](AWS_MANUAL_SETUP.md).

## Actual verification

| Check | Result |
|---|---|
| Backend tests | 17 passed, 1 environment-dependent skip, 0 failures |
| Mocked AWS monitoring tests | 6 passed, 0 failures |
| Python startup/restoration tests | 7 passed, 0 failures |
| Storefront and dashboard production builds | Passed |
| All custom Docker image builds | Passed |
| Local HTTP integration | Passed, including existing 12 Supabase products and 5 saved runs |
| Database readiness | HTTP 200, database reachable |
| AWS Nginx tested locally | Auth, wrong-password rejection, assets, refresh and monitoring prefix passed |
| Terraform initialization/config validation | Passed; AWS provider locked at 6.72.0 |
| Terraform mock plans | 2 passed, 0 failures; no AWS account calls or resources |
| Candidate-secret audit / Git whitespace check | Passed at verification; review staged diff before commit |

The Terraform tests initially could not evaluate computed ARN-dependent startup
checks during plan. Explicit fixture ARNs fixed the test setup; final tests passed.
A local request briefly returned 502 while backend containers were recreated; the
subsequent integration run passed after DNS/health settled. Prior load-test failures
remain saved and are not rewritten into successes. No extended stress test ran.

Evidence is local and ignored by Git: `load-tests/results/backend-aws-preparation-tests.log`,
`monitoring-aws-tests.log`, `aws-preparation-build.log`, `aws-preparation-http.json`,
and `infrastructure/validation/{terraform-init,terraform-validate,terraform-test,aws-routing}.log`.
The dashboard was also checked in the browser after the changes.

## What remains, in order

1. Review the source and staged diff, then commit/push when ready. Existing working
   changes and Git history remain preserved; publication is a separate explicitly authorized action.
2. Choose regular AWS vs Academy, check region, budget, quotas and allowed profile.
3. Obtain a controlled hostname and issued ACM certificate in the deployment region.
4. Publish the reviewed images, inspect ECR scans and retain the digest manifest.
5. Configure existing database credentials/CA and dashboard credentials in SSM.
6. Set account-specific tfvars, inspect a real plan, then apply manually.
7. Configure DNS and verify boot, all target groups, products, HTTPS/auth and AWS metrics.
8. Run an approved pilot and fixed-capacity/scaling experiments, preserve raw evidence,
   export CloudWatch intervals and collect actual scale-out/in screenshots/timestamps.
9. Export results and clean up only this project's resources after the demonstration.

## Practical boundaries

The template uses public subnets and public IPv4 for outbound access, with app
inbound traffic restricted to ALB; it does not deploy private-subnet/NAT architecture.
The expected fleet is 3 EC2 instances initially and up to 5 during scaling. Updates
at one backend can interrupt service. Memory requires the CloudWatch agent. AWS
metric publication is delayed; per-instance request distribution is unavailable.
CloudWatch target latency is different from client latency. Dashboard results survive
container restart but must be exported before EC2 replacement. Base tags are mutable,
so deploy the release's actual application digests. Account permissions, first-boot
behavior, certificate/CA setup and live AWS experiments remain unverified until you
perform the runbook. Local smoke results are not proof of AWS elasticity.

**Next step:** follow runbook sections 1-2 to review/commit the verified source,
then section 3 onward for your manual AWS setup. Do not provision AWS simply because
mock tests passed.
