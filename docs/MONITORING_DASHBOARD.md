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
