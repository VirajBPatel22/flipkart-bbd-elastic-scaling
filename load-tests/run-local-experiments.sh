#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
docker info >/dev/null
command -v python3 >/dev/null
command -v curl >/dev/null
scenario=${SCENARIO:-compute}
case "$scenario" in baseline|ramp-up|sustained|recovery|compute) ;; *) echo 'Unknown scenario'; exit 1;; esac
rate=${RATE:-1}; duration=${DURATION:-10s}; baseline=${BASELINE_REPLICAS:-1}
[[ "$rate" =~ ^[1-9][0-9]*$ && "$baseline" =~ ^[123]$ ]] || exit 1
mkdir -p load-tests/results
export LOCAL_UID=$(id -u) LOCAL_GID=$(id -g)
sampler=''
cleanup() {
  if [[ -n "$sampler" ]]; then kill "$sampler" 2>/dev/null || true; wait "$sampler" 2>/dev/null || true; fi
  docker compose up -d --scale backend="$baseline" backend >/dev/null
}
trap cleanup EXIT
wait_count() {
  for attempt in $(seq 1 40); do
    if curl --connect-timeout 2 --max-time 8 -fsS ${BASE_URL:-http://localhost:8081}/monitoring-api/api/overview | python3 -c 'import json,sys; d=json.load(sys.stdin); n=int(sys.argv[1]);sys.exit(not(d.get("replicaCount")==n and d.get("healthyCount")==n))' "$1"; then return; fi
    sleep 2
  done
  echo "Replica readiness timed out" >&2; return 1
}
for replicas in 1 2 3; do
  docker compose up -d --scale backend="$replicas" backend
  wait_count "$replicas"
  sleep 3
  id="$(date -u +%Y%m%dT%H%M%SZ)-$(python3 -c 'import uuid;print(uuid.uuid4().hex[:8])')-${scenario}-${replicas}"
  prefix="load-tests/results/$id"
  # Record observed identities independently of assumptions about round robin.
  for i in $(seq 1 24); do curl --connect-timeout 2 --max-time 8 -fsS ${BASE_URL:-http://localhost:8081}/api/instance; echo; done > "$prefix.identities.jsonl"
  (while true; do curl --connect-timeout 2 --max-time 8 -fsS ${BASE_URL:-http://localhost:8081}/monitoring-api/api/overview || true; echo; sleep 1; done) > "$prefix.metrics.jsonl" &
  sampler=$!
  status=0
  docker compose --profile load-test run --rm -e RATE="$rate" -e DURATION="$duration" -e ITERATIONS="${ITERATIONS:-10000}" -e TARGET=compute -e RESULT_FILE="/scripts/results/$id.k6.json" k6 run "/scripts/scenarios/$scenario.js" > "$prefix.log" 2>&1 || status=$?
  kill "$sampler" 2>/dev/null || true; wait "$sampler" 2>/dev/null || true; sampler=''
  if [[ -f "$prefix.k6.json" ]]; then python3 load-tests/summarize.py "$prefix.k6.json" "$prefix.metrics.jsonl" "$prefix.summary.json" "$scenario" "$replicas" "$rate" "$status" "${ITERATIONS:-10000}" "$duration"; fi
  if (( status != 0 )); then cat "$prefix.log"; exit "$status"; fi
done
