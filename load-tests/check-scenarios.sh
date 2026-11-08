#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
docker compose --profile load-test run --rm --entrypoint sh k6 -c 'for scenario in baseline ramp-up sustained recovery compute; do k6 inspect -e LOAD_TEST_TOKEN=syntax-check-only /scripts/scenarios/$scenario.js >/dev/null || exit; echo "$scenario: valid"; done'
