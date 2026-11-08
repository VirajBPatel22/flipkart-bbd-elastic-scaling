# Local implementation and verification report

Verified 8 November 2026 (Asia/Kolkata). Existing checkout preserved on branch
`main`. No commit, push, migration, seed, Terraform apply, or AWS deployment was
performed. The stack is left running with **one backend replica**.

## A. Repository audit

Before changes, Git already showed modified README/.gitignore and untracked
application, Compose, database, documentation, and infrastructure directories.
Those were existing user work, not newly generated empty scaffolds.

| Component | Initial finding | Final local status |
|---|---|---|
| Storefront | Implemented React catalogue, search/filter, status, placeholders | Reused; source/image builds and browser catalogue/filter checked |
| Backend | Express/pg, health/products/identity, token-checked worker compute, shutdown | Reused; added bounded HTTP instrumentation and explicit-token configuration |
| Supabase | Existing runtime configuration and schema/seed files | Read-only product retrieval returned 12 products; no database changes |
| Docker | Four Dockerfiles and a four-service Compose file | Builds pass; removed manifest/lockfile self-links and fixed environment handling |
| Load balancing | Frontend Nginx proxied a static backend address | Added dynamic-DNS gateway; 1/2/3 replica distribution verified |
| Dashboard/API | Placeholder UI and health-only monitoring API | Real measurements, charts, table, events and persisted experiments |
| Metrics | Missing | Fixed-function local collector plus per-process HTTP samples |
| Load tests/results | README and .gitkeep scaffolding | Five k6 scenarios, safe runner, actual JSON/CSV/log/identity evidence |
| Infrastructure | README and empty Terraform/scripts placeholders | Added local gateway/collector and read-only verification script; AWS still pending |
| Documentation | Mixed planning and outdated local descriptions | Updated current entry points, added focused current operational guides |

## B. Changes made

Modified `compose.yaml` to provide gateway, frontend, scalable backend,
dashboard-frontend, monitoring-api, collector, and opt-in k6 services. Only gateway
publishes a loopback port. Removed fixed backend name/port and the blank Compose
database override; backend/.env now remains the runtime source of truth.

Reused the four Dockerfiles. Corrected accidental root-package self-dependencies
in all application manifests/lockfiles so isolated npm ci builds succeed. Simplified
frontend Nginx configs to static SPA serving; dashboard Vite base and favicon now
support `/dashboard/`. Storefront design and product behavior were preserved.

Added `infrastructure/nginx/gateway.conf`, `infrastructure/collector/Dockerfile`,
`collector.py`, and `infrastructure/scripts/verify-local.py`. Added backend metrics
middleware/service and metrics regression test; compute tests explicitly configure
a test-only token. Removed hard-coded token fallback. Since the existing private
backend/.env lacked a token, appended a generated secret without printing it or
changing its database settings. Updated .env examples to avoid reusable tokens.

Added `dashboard/monitoring-api/src/monitoring.js` and wired it into the existing
app. Implemented the existing dashboard page/client and extended existing CSS.
Added `load-tests/scenarios/{common,baseline,ramp-up,sustained,recovery,compute}.js`,
`run-local-experiments.sh`, `summarize.py`, and `check-scenarios.sh`.

Updated README, LOCAL_DEVELOPMENT, testing/deployment and load-tests README;
added DOCKER_SETUP, MONITORING_DASHBOARD, LOAD_TESTING, AWS_DEPLOYMENT_READINESS
and this evidence report. Historical research remains intact.

## C. Docker environment

WSL2 Ubuntu 24.04, Docker Engine 29.8.1, Compose v5.5.1. Path conversion and real
hello-world succeeded. All five custom images built with npm ci where applicable.
Gateway uses nginx:1.28-alpine. The four application containers are healthy;
gateway and collector are running. Collector has no Docker HEALTHCHECK, so it is
not described as Docker-healthchecked. Real collection and its freshness were
verified through the monitoring API.

One project-scoped bridge network connects services by Docker DNS. No backend,
monitoring API or collector host ports are published. The only published route is
`127.0.0.1:8081`; port 8080 was already serving Windows Apache and was left alone.
Set GATEWAY_PORT to override. No unrelated Kubernetes/Docker containers were stopped.

WSL stopped between short-lived commands on this host. A temporary hidden
wsl.exe keepalive (Windows PID 18144) was left running; keep a normal WSL terminal
open for subsequent demos. See DOCKER_SETUP for shutdown and helper cleanup.

## D. Application verification

- Backend suite: **14 passed, 0 failed, 1 skipped** (unconfigured DB test skips
  when a connection string exists). Evidence: `load-tests/results/backend-tests.log`.
- Both React production builds passed; all custom image builds passed. The final
  cached build output is `load-tests/results/docker-build.log`.
- HTTP integration checked storefront/dashboard HTML and JS/CSS assets, dashboard
  refresh fallback, backend health/products/identity, monitoring health/overview/
  history/experiments/CSV, category filter and bounded product limit.
- **12 products** came from the existing Supabase database. Browser catalogue
  rendered all 12; Fashion filtering rendered the existing cotton T-shirt.
- Internal metrics returned 404 through gateway; unauthenticated compute returned
  401. Authenticated compute succeeded in actual k6 runs.
- After monitoring restart/recreation, **five measured runs** remained available.
  The invalid no-request attempt is preserved on disk but excluded from exports
  and dashboard comparisons. Live histories/events reset by design.
- Browser displayed live measurements, all five experiment rows, explicit FAILED
  threshold status, workload selector, and measured comparison charts. Screenshot:
  `load-tests/results/dashboard-verified.jpg`. No broad desktop/browser matrix was run.

Detailed HTTP evidence: `load-tests/results/http-verification.json` and
`http-final.json`; container evidence: `compose-status.txt` and
`compose-verification.log`. Live error percentages can include deliberate 401
checks; that is expected measured behavior, not fabricated failure data.

## E. Scaling verification

The runner waited for the exact running/healthy count before each test. These are
actual 24-request identity samples, recorded in each `.identities.jsonl`:

| Backends | Observed instance ID → response count |
|---|---|
| 1 | local-72df878400d4 → 24 |
| 2 | local-72df878400d4 → 12; local-9649abe2cf6a → 12 |
| 3 | local-72df878400d4 → 8; local-9649abe2cf6a → 8; local-e59e5dbdc7c5 → 8 |

Counts above are observations, not an assumption that all workloads distribute
evenly. Docker DNS refresh discovered scale changes without manually reloading
Nginx. The runner restored one backend. This is **manual local horizontal scaling**,
not AWS Auto Scaling. Nginx uses passive failure handling; it does not directly
consume Docker health status or actively probe targets.

## F. Monitoring

Container CPU/memory/state/health come from Docker Engine list/inspect/stats.
Application completions, duration and 400+ status counters come from backend
middleware, excluding health/collector probes. Overview and chart histories are
real snapshots; nulls display Unavailable. CPU is mean per backend with one core
equal to 100%; memory bytes sum across backends. HTTP samples are a bounded
60-second window, at most 10,000 per replica. See MONITORING_DASHBOARD for formulas,
restart effects and sampling limitations.

Only the fixed-function collector mounts the Docker socket. Its HTTP interface
cannot forward caller-supplied daemon requests. Socket mounting still makes a
collector compromise powerful; read-only mount flags are not Docker authorization.
This architecture is for a trusted local machine and must be replaced for AWS.

## G. Actual k6 experiments

All measured runs used authenticated local compute, avoiding database load.
The matched lighter set offered 1 request/second, 10-second configured duration,
10,000 hash iterations/request. k6 wall duration can include final in-flight work.

| Replicas | Requests | Throughput/s | Mean ms | p50 ms | p95 ms | Failures | Dropped | Mean CPU % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 11 | 1.052 | 491.01 | 430.71 | 718.11 | 0 | 0 | 33.13 |
| 2 | 10 | 1.000 | 423.39 | 431.31 | 536.30 | 0 | 0 | 13.22 |
| 3 | 11 | 1.035 | 515.86 | 463.31 | 794.39 | 0 | 0 | 11.14 |

All three lighter runs passed k6 thresholds. Results IDs:

- `20261108T070830Z-95680438-compute-1`
- `20261108T070900Z-e5c3eeb3-compute-2`
- `20261108T070931Z-8eef75fc-compute-3`

Earlier 2 requests/second, 50,000-iteration runs are retained separately:

| Replicas | Requests | Mean ms | p95 ms | Failure % | Dropped | Thresholds |
|---|---:|---:|---:|---:|---:|---|
| 1 | 20 | 556.21 | 948.42 | 0 | 1 | Passed |
| 2 | 19 | 1069.08 | 1595.07 | 5.26 | 2 | FAILED |

The runner stopped on that threshold failure and restored one replica. The exact
failed HTTP status was not retained in the k6 summary; no cause is asserted. The
initial missing-token attempt sent no HTTP requests and is explicitly invalid.

These are smoke measurements on a shared host with other workloads. Dropped
iterations in the earlier runs demonstrate an offered-load limitation; they must
not be ignored. No performance improvement or elastic-capacity claim is supported.
All five scenario configurations passed k6 inspect; only compute scenarios were
actually load-executed. Extended stress testing was not performed.

## H. AWS deployment readiness

Containers build and run locally, expose liveness, and use runtime backend secrets.
Backend/monitoring run as non-root; existing graceful shutdown remains intact.
AWS_DEPLOYMENT_READINESS maps each image to frontend/dashboard EC2, backend ASG,
ALB, CloudWatch and existing Supabase. Terraform remains placeholder-only.

AWS metric adapters, IAM, TLS/security groups, immutable release tagging/base
digest pinning, registry publishing and actual infrastructure still need a separate
authorized AWS phase. Existing DB certificate-chain verification is disabled and
must be hardened for production. No cloud behavior is presented as verified.

## I. Remaining limitations

AWS deployment/Auto Scaling/CloudWatch are unimplemented. Live histories are
in-memory; experiments persist. Bounded HTTP samples can undercount at high load
or replica replacement. Nginx can briefly fail requests during abrupt scale-down.
Only compute was smoke-executed; other scenarios were configuration-validated.
Comparison groups separate scenario/rate/iterations; compare configured durations
in exports before drawing further conclusions. Current image tags are mutable.
Local socket collector requires a trusted host. WSL must remain running.

## J. Exact WSL commands

```bash
cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=100
# http://localhost:8081/ and http://localhost:8081/dashboard/

docker compose up -d --scale backend=1
docker compose up -d --scale backend=2
docker compose up -d --scale backend=3
docker compose up -d --scale backend=1

python3 infrastructure/scripts/verify-local.py
bash load-tests/check-scenarios.sh
SCENARIO=compute RATE=1 ITERATIONS=10000 DURATION=10s bash load-tests/run-local-experiments.sh

npm test --prefix backend
npm run build:frontend
npm run build:dashboard-frontend

curl -fsS http://localhost:8081/monitoring-api/api/experiments.csv > /tmp/bbd-experiments.csv
docker compose build
docker compose up -d
docker compose down
```

Use Node/npm in an environment where dependencies match the OS. The source tests
and standalone React builds in this verification ran on Windows; Docker Linux
builds used isolated npm ci installs. Do not share Windows native node_modules
with WSL Node without reinstalling for Linux. Docker commands above are WSL-native.

Implementation references: [Nginx upstream DNS resolution](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
and [Docker Engine API](https://docs.docker.com/reference/api/engine/).
