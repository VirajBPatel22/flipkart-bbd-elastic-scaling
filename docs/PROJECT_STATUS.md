# Current project status — 9 November 2026

The AWS proof of concept is deployed and CPU-triggered scale-out **and** scale-in
have been verified live. This supersedes the earlier preparation-only snapshot.
The academic report is intentionally unchanged in this coding/verification phase.

## Verified automatic cycle

| Event (UTC, 9 November 2026) | Observed evidence |
|---|---|
| 12:09:32 | Bounded synthetic host CPU test started on the sole backend |
| 12:13:56 | High CPU alarm triggered `bbd-it457-cpu`: desired 1 → 2 |
| 12:16:04 | First observer sample with two healthy ALB targets |
| 12:17:07 | Scale-out activity marked Successful by AWS |
| 12:31:33 | Low CPU alarm triggered the same policy: desired 2 → 1 |
| 12:32:37 | Observer finished with one backend and one healthy target |

The workload was two CPU-busy processes for 360 seconds, bounded independently by
a systemd runtime limit. CloudWatch recorded CPU near 100%, then below 1% after
the load stopped. The existing policy/alarm settings were preserved: target 50%,
high alarm three one-minute samples over 50%, low alarm fifteen samples under 35%.
Desired capacity was not set manually during observation or cleanup.

This proves CPU-metric-driven elasticity, **not** an HTTP throughput improvement
under that workload. The earlier k6 comparison is a separate experiment. No fake
metrics, forced alarm states or shortened evaluation periods were used.

Raw AWS activities explicitly name the high/low alarms as their causes. The saved
summary has `scaleOutObserved`, `healthyScaleOutObserved`, `scaleInObserved` all
true and `manualCapacityCleanup` false. See [proof artifacts](evidence/2026-11-09-automatic-scaling/README.md).

## Code and deployment

- Storefront, product API, Supabase readiness and AWS monitoring are working.
- Public HTTP ALB serves read-only storefront/status/product paths. Dashboard and
  protected compute use SSM; public sensitive routes are denied.
- Supabase database TLS verifies the installed root CA. Existing data is retained.
- Amazon Linux bootstrap uses the correct `awscli-2` package.
- Normal deployed ASG bounds are **1–2**, desired **1**, with compute disabled and
  scaling processes enabled. Two standalone web instances plus two t3.micro
  backends fit the account's 8-vCPU limit. A third backend needs additional quota.
- Terraform supports configurable maximum 1–3. The demo example selects 2; the
  default 3 remains available for an account with sufficient quota.
- Eleven Python checks and five Terraform mock plans pass. GitHub CI also tests
  the Node applications, builds both frontends and builds Docker images.
- Source is published on `ompatel/full-project-aws-setup`; `main` is unchanged.
  Commit author/committer are the configured `Ompatel28102004` identity.

For a repeat run use [automatic scaling verification](AUTO_SCALING_VERIFICATION.md).
For deployment and cleanup use [ALB demo setup](ALB_DEMO_SETUP.md).
The deployment remains billable while running.

## Remaining outside this coding phase

Update the academic report with this new automatic-cycle evidence later. A
three-backend benchmark still requires quota/architecture changes. Fixed-capacity
repetitions and production hardening are separate from the verified classroom
demo; do not describe the public HTTP deployment as a production store.
