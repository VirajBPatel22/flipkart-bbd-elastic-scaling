# Live AWS deployment verification — 9 November 2026

> Early deployment snapshot, before the automatic CPU test. See
> [current project status](PROJECT_STATUS.md) for the subsequently completed
> 1 → 2 → 1 automatic cycle and the current quota-safe maximum of two.

The domain-free ALB deployment was repaired and checked live in ap-south-1.
This records actual checks; it does not claim a completed scaling experiment.

## Repairs applied

- Corrected the Amazon Linux 2023 bootstrap package from `awscli2` to `awscli-2`.
  The original package error stopped installation before Docker or bbd.service.
- Applied the corrected Terraform plan, replacing frontend/dashboard instances
  and updating the backend launch template. The backend refresh completed
  successfully. Removed the failed instance from the original launch template.
- Added the Supabase Root 2021 CA to the existing backend SSM SecureString's
  `database_ca_base64` field, retaining the other fields. Database TLS verification
  remains enabled. No schema changes, seed or database reset were performed.
- Installed Session Manager plugin 1.2.896.0 in WSL and started dashboard and
  compute tunnels. These sessions require current AWS credentials and can expire.

## Live results

| Check | Observed result |
|---|---|
| Public storefront | HTTP 200 |
| `/api/health` | HTTP 200 |
| `/api/ready` | HTTP 200, database reachable |
| `/api/products` | HTTP 200, 12 products |
| Public dashboard, monitoring and compute paths | HTTP 403 |
| Dashboard through SSM without authentication | HTTP 401 |
| Authenticated dashboard and monitoring overview | HTTP 200 |
| Monitoring data | AWS target health, CPU and memory observed |
| Backend target after repair | One healthy target |
| Backend instance refresh | Successful, 100 percent |
| CPU target tracking | 50 percent, high/low alarms present, capacity 1–3 |
| Final Terraform plan | No changes |
| Local validation | 10 Python tests and four Terraform mock plans passed |

Authentication was checked using a temporary verification entry removed afterward;
the existing dashboard user's credentials were preserved.

## Bounded compute smoke test

Run ID: `20261109T113734Z-a0c9a991-aws-observe-2`.
The name includes the two ASG members present during replacement; only one target
was healthy. This is an observe-mode smoke test, not a two-replica comparison.

- Configured rate 1 request/second, duration 10 seconds, iterations 10000.
- Actual 11 requests, 11 successful, zero failed and zero dropped iterations.
- Average response 163.17 ms; p95 192.69 ms; k6 exit 0.
- Used the encrypted SSM compute tunnel to the ALB private address. VPC HTTP hops
  remain unencrypted, as documented in ALB_DEMO_SETUP.md.
- Compute was enabled temporarily on the verified backend and restored to disabled
  after testing. Terraform's `enable_compute` remains false.
- Raw results, state samples and logs are under `load-tests/results/` (Git ignored).

## Access

Storefront: http://bbd-it457-1687796361.ap-south-1.elb.amazonaws.com

Dashboard while the SSM tunnel is active: http://127.0.0.1:18080/dashboard/

Restart the dashboard tunnel from WSL if it closes:

```bash
cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling
AWS_PROFILE=it457-login python3 infrastructure/scripts/start-aws-tunnel.py dashboard \
  --target i-0d4fcf6334aacba4f
```

If the login expired, run `aws login --profile it457-login --remote` first.
Instance IDs can change after replacement; use current Terraform outputs then.
The public ALB permits the configured public IPv4 /32. Update it with a reviewed
Terraform plan if your Internet connection changes.

## Remaining project evidence

The deployment is ready for verification and demonstration. Longer bounded
experiments are still needed to establish CPU-triggered scale-out/scale-in and
compare fixed capacities 1, 2 and 3. The smoke test does not prove those behaviors.
Review and commit/push the new ALB mode and repair changes before final submission.
Resources remain running and billable. Follow ALB_DEMO_SETUP.md for cleanup.
