#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
mkdir -p infrastructure/validation
docker compose config --quiet
for file in infrastructure/scripts/*.sh load-tests/*.sh; do bash -n "$file"; done
python3 -m unittest discover -s infrastructure/tests -p 'test_*.py'
tf() { docker run --rm -v bbd-it457-terraform-data:/terraform-data -e TF_DATA_DIR=/terraform-data -v "$PWD:/workspace" -w /workspace/infrastructure/terraform hashicorp/terraform:1.13.5 "$@"; }
tf fmt -check -recursive
tf init -backend=false -input=false
tf validate
tf test -no-color
python3 infrastructure/scripts/check-release.py
echo 'Offline/source checks passed. No AWS plan, apply, image push or account API calls were performed.'
