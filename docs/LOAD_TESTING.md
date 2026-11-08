# Controlled local k6 tests

```bash
cd /mnt/c/Users/okpat/Desktop/flipkart-bbd-elastic-scaling
docker compose up --build -d
SCENARIO=compute RATE=1 DURATION=10s bash load-tests/run-local-experiments.sh
```

Each summary includes workload iterations, configured duration and k6 threshold status.
The dashboard groups comparisons by scenario, offered rate and iterations.

The runner verifies Docker and healthy replica counts, tests 1, 2 and 3 backends,
records 24 actual instance responses per configuration, saves k6 output and
concurrent monitoring samples, writes JSON/CSV summaries, and restores one backend
on exit (including failure). Override restoration with `BASELINE_REPLICAS=2`.
Use Bash inside WSL with Python3 and curl. Results use timestamp plus random IDs;
previous runs are preserved. No tests run during normal Compose startup.

Runner defaults are 1 request/second for 10 seconds, authenticated compute with 10,000
iterations, 2 preallocated VUs and a maximum of 8 VUs. k6 receives the token from
backend/.env, never browser code. The runner targets compute in every scenario to
avoid loading the shared external database. Baseline/sustained use constant arrival
rate; ramp-up increases from 1 to RATE and holds; recovery increases then reduces
to 1. Each ramp stage lasts DURATION. Do not run extended stress tests without
approval. For a standalone low-rate identity smoke test:

```bash
id=$(date -u +%Y%m%dT%H%M%SZ)
docker compose --profile load-test run --rm \
  -e RATE=1 -e DURATION=5s -e RESULT_FILE=/scripts/results/$id.k6.json \
  k6 run /scripts/scenarios/baseline.js
```

Standalone scripts default to identity (compute.js always uses compute); set
`TARGET=compute` for any other scenario. Set ITERATIONS to configure compute size.
The experiment runner passes RATE, DURATION and ITERATIONS; set other k6 variables explicitly
with `docker compose run -e ...` for standalone runs.

Files per run: `.k6.json`, `.log`, `.metrics.jsonl`, `.identities.jsonl`,
`.summary.json`, and `.csv`. Summary includes total/successful/failed HTTP requests,
throughput, mean/p50/p95 latency, failure fraction, offered rate, duration, dropped
iterations, sampled CPU and memory, replica count and timestamp. CPU/memory are
arithmetic means of monitoring snapshots during the run (repeated snapshots can
occur). CPU includes all backend activity, not just compute. Check metricSamples,
raw snapshots and droppedIterations before drawing conclusions. A nonzero k6 exit
is propagated even if its summary is saved. The max-VU cap and dropped iterations
can limit offered load. Local backends and k6 share host CPU; smoke results cannot
establish elastic capacity or performance improvement.

Refresh the dashboard to see summaries; the next poll normally suffices. Export
all runs at `/monitoring-api/api/experiments.csv`. Summaries are ignored by Git by
default; intentionally select sanitized artifacts for the final report.

## AWS experiments

Use `run-aws-experiments.py --help` and the experiment section of
[AWS_MANUAL_SETUP.md](AWS_MANUAL_SETUP.md). It is a distinct AWS runner, not the
local Docker scaler. Fixed mode changes ASG capacity only with an explicit flag;
observe mode leaves scaling enabled. Tests verify restoration after exceptions.
Only a live authorized AWS run can verify automatic scaling.
