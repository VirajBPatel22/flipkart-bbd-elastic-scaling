#!/usr/bin/env bash
# Manual, billable-account operation. Never called by local setup or CI.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
: "${AWS_REGION:?Set AWS_REGION}"
[[ ${CONFIRM_AWS_WRITES:-} == yes ]] || { echo 'Set CONFIRM_AWS_WRITES=yes only when ready to create ECR repositories and push images.'; exit 1; }
command -v aws >/dev/null
docker info >/dev/null
[[ -z $(git status --porcelain) ]] || { echo 'Commit/review your source first; the release must have a clean working tree.'; exit 1; }
tag=$(git rev-parse --short=12 HEAD)
account=$(aws sts get-caller-identity --query Account --output text)
registry="$account.dkr.ecr.$AWS_REGION.amazonaws.com"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$registry"
mkdir -p infrastructure/releases
release="infrastructure/releases/$tag-images.tfvars.json"
[[ ! -e "$release" ]] || { echo 'This release manifest already exists; preserve it and use a new source commit.'; exit 1; }
declare -A paths=([frontend]=frontend [backend]=backend [dashboard]=dashboard/frontend [monitoring]=dashboard/monitoring-api)
declare -A digests
for component in frontend backend dashboard monitoring; do
  repository="bbd/$component"
  if ! aws ecr describe-repositories --region "$AWS_REGION" --repository-names "$repository" >/dev/null 2>&1; then
    aws ecr create-repository --region "$AWS_REGION" --repository-name "$repository" --image-tag-mutability IMMUTABLE --image-scanning-configuration scanOnPush=true >/dev/null
  fi
  docker build --pull --platform linux/amd64 --build-arg VITE_API_BASE_URL= --build-arg VITE_DASHBOARD_URL=/dashboard/ -t "$registry/$repository:$tag" "${paths[$component]}"
  docker push "$registry/$repository:$tag"
  digest=$(aws ecr describe-images --region "$AWS_REGION" --repository-name "$repository" --image-ids imageTag="$tag" --query 'imageDetails[0].imageDigest' --output text)
  [[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || exit 1
  digests[$component]="$registry/$repository@$digest"
done
python3 - "$release" "${digests[frontend]}" "${digests[backend]}" "${digests[dashboard]}" "${digests[monitoring]}" <<'PY'
import json,sys,pathlib
pathlib.Path(sys.argv[1]).write_text(json.dumps({'images':dict(zip(['frontend','backend','dashboard','monitoring'],sys.argv[2:]))},indent=2)+'\n')
PY
echo "Release recorded in $release. Review ECR scan findings before deployment."
