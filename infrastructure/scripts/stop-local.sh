#!/usr/bin/env bash
# Stops the local Docker Compose stack without removing volumes. No AWS
# resources are touched by this script; see stop-project.py for AWS.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
docker compose down
echo "Local stack stopped. No volumes were removed."
