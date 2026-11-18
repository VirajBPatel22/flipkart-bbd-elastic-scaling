# Monitoring dashboard

Open `/dashboard/` through the local gateway. Overview, instances, live history,
actual per-replica request counters, experiment comparisons, and observed local
scaling events use measurements, not synthetic values. Missing values display
Unavailable. AWS mode uses the SDK adapter; live verification requires deployment.

The local collector has one GET endpoint, `/snapshot`. It reads only Docker list,
inspect and stats for backend containers with this Compose project's labels,
then fetches each backend's internal HTTP samples. It accepts no caller-provided
Docker paths, container IDs, commands, or mutations. Neither collector nor Docker
API has a published port. Gateway blocks the backend's `/internal/metrics` route.

The collector alone mounts `/var/run/docker.sock`. A read-only socket mount does
**not** make daemon access read-only: compromise of this collector can control the
host. The fixed-function interface, read-only root filesystem, dropped capabilities
and no-new-privileges reduce exposure; they are not a daemon authorization boundary.
Use only on a trusted local machine. Do not deploy this socket architecture to AWS.

CPU is derived from differences in Docker total CPU time / system time multiplied
by online CPUs: 100% means one CPU core. Overview CPU is mean per running backend.
Memory subtracts inactive file cache; total bytes and mean percentage of container
memory limits are shown. Without explicit limits, the daemon's host limit applies.

HTTP completion samples record latency and status errors (400+) in each replica's
last 60 seconds, capped at 10,000 samples per replica. Probes for health and metrics
are excluded. Request rate divides observed samples by up to 60 seconds of maximum
replica uptime. Latency is the arithmetic mean and nearest-rank p95 over the merged
sample window. At high traffic the sample cap undercounts rate; these are bounded
demo metrics, not Prometheus. Idle latency/error fraction is unavailable. Replica
turnover loses old process samples; counters reset per replica. Gateway/network
latency is measured separately by k6.

Collector runs approximately every 3 seconds; monitoring retains 120 samples and
100 observed replica changes in memory. Collector failure/staleness is explicit.
Histories and scaling events reset on monitoring restart. Experiments persist on
the host under `load-tests/results`; the API mounts them read-only and reloads
summaries for every request. Live x-axis uses actual timestamps relative to the
first displayed sample. Experiment graphs include only saved actual results.

## AWS adapter

Set ENVIRONMENT=AWS with AWS_REGION, ASG_NAME, TARGET_GROUP_ARN and LOAD_BALANCER_ARN.
Credentials come from the instance role. Polling is every 30 seconds, with 60-second
CloudWatch periods and the latest minute excluded to allow publication. Desired,
InService, running and healthy counts are separate. Target 4xx/5xx errors exclude
ALB-generated errors. Partial metric series remain unavailable. Target response
time is target time to response headers, not k6 client latency. Histories reset on
restart; AWS scaling activities are fetched again. Memory requires CWAgent.

## Dashboard UI (redesigned)

The frontend is a single-page app with left-hand section navigation (no added
routing dependency): **Overview**, **Instances**, **Metrics**, **Load Tests** and
**Results**. All sections read from the same `/api/overview`, `/api/history`,
`/api/events` and `/api/experiments` responses described above — the redesign is a
presentation layer, not a new data source. The header shows the live environment
badge (Local Docker / AWS, taken from `overview.environment`), a **Fetch Latest
Metrics** button that re-polls all panels and records the last successful refresh
time, and a **Start Test Now** button.

**Start Test Now** opens a form with a test name, a target environment (read-only,
taken from the backend configuration), a duration (10–60s) and a request rate
(1–5 req/s), and a read-only backend-capacity display. It never accepts an
arbitrary URL. Two modes are offered, matching exactly what the monitoring API can
execute today:

- **API Probe** — the existing bounded, read-only probe against the configured
  backend target (`POST /api/test`).
- **CPU Scaling Observation** — the existing confirmed, bounded AWS SSM CPU load
  used to observe the target-tracking policy (`POST /api/test` with `type: "cpu"`),
  only enabled where the API already enables it.

The form also lists the project's five k6 scenario scripts (Baseline, Ramp-Up,
Sustained Load, Recovery, Compute Stress) for reference, because those are
executed with `load-tests/run-local-experiments.sh` / `run-aws-experiments.py`
outside the browser (see [LOAD_TESTING.md](LOAD_TESTING.md)) — the dashboard does
not spawn k6 or shell processes itself, since the monitoring API container has no
Docker-socket or remote-shell access by design. Saved runs from either path
appear automatically under **Results** once their `.summary.json` file exists.

A **Results** section replaces the old flat table with search, scenario/status
filters, most-recent-first sorting, pagination, a **View** action that opens full
run details (summary, performance metrics, available raw evidence files and
JSON/CSV export), and a **Compare Experiments** tab that groups only
environment/scenario/rate/iteration-compatible runs together.

New read-only endpoints back the Results section without duplicating the existing
`/api/experiments` and `/api/experiments.csv` routes:

- `GET /api/experiments/:id` — single saved run as JSON.
- `GET /api/experiments/:id/csv` — single saved run as a one-row CSV download.
- `GET /api/experiments/:id/files` — which raw evidence files exist for that run
  on this host (summary/k6/csv/log/metrics/identities/aws/activities), from an
  allowlist of fixed suffixes; nothing outside `RESULTS_DIR`/`UI_RESULTS_DIR` or
  outside that allowlist can be requested.
- `GET /api/experiments/:id/files/:filename` — downloads one such file.

The Overview CPU-by-instance chart also required one internal change: the
in-memory history buffer now retains a trimmed `{id, cpu, memoryPercent}` array
per sample (previously discarded) so per-instance CPU over time can be drawn
without inventing zeros when an instance joins, leaves, or has no sample yet.
