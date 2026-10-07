#!/usr/bin/env bash
# Deploy built probe artifacts into the AWS integration estate.
# Prerequisites: ./modules/probes/build.sh ; AWS credentials ; cluster reachable.
# Usage:
#   ./modules/probes/deploy-aws.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LAMBDA_ZIP="$ROOT/modules/cloud-api-test/terraform/aws/lambda/probe-lambda.zip"
FUNCTION_NAME="${REACHABILITY_LAMBDA_NAME:-finos-ccc-reachability-probe}"
CLUSTER_NAME="${EKS_CLUSTER_NAME:-finos-ccc-integration-k8s-main}"
WEBHOOK_NS="${WEBHOOK_PROBE_NAMESPACE:-ccc-admission-webhook-probe}"
WEBHOOK_DEPLOY="${WEBHOOK_PROBE_DEPLOYMENT:-ccc-admission-webhook-probe}"
WEBHOOK_CONTAINER="${WEBHOOK_PROBE_CONTAINER:-webhook}"
LOCAL_WEBHOOK_IMAGE="${WEBHOOK_PROBE_IMAGE:-finos-ccc-admission-webhook-probe:local}"
ECR_REPO="${WEBHOOK_ECR_REPO:-finos-ccc-admission-webhook-probe}"
AWS_REGION="${AWS_REGION:?AWS_REGION is required}"

if [[ ! -f "$LAMBDA_ZIP" ]]; then
  echo "error: missing $LAMBDA_ZIP — run modules/probes/build.sh first" >&2
  exit 1
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

SECRET_ARN="${REACHABILITY_PROBE_SECRET_ARN:-finos-ccc-reachability-probe-shared-secret}"
OBSERVER_NAME="${REACHABILITY_PROBE_OBSERVER:-finos-public-probe}"
TARGET_ALLOWLIST="${REACHABILITY_TARGET_ALLOWLIST:-*.amazonaws.com,*.azmk8s.io,*.googleapis.com,*.googleusercontent.com,*.cloudapp.azure.com}"
PORT_ALLOWLIST="${REACHABILITY_PORT_ALLOWLIST:-443,22,3389}"
SHARED_SECRET="$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ARN" \
  --region "$AWS_REGION" \
  --query SecretString \
  --output text)"
ENV_JSON="$(mktemp)"
trap 'rm -f "$ENV_JSON"' EXIT
export SHARED_SECRET OBSERVER_NAME TARGET_ALLOWLIST PORT_ALLOWLIST
python3 - "$ENV_JSON" <<'PY'
import json, os, sys
json.dump({
  "Variables": {
    "SHARED_SECRET": os.environ["SHARED_SECRET"],
    "OBSERVER_NAME": os.environ["OBSERVER_NAME"],
    "TARGET_ALLOWLIST": os.environ["TARGET_ALLOWLIST"],
    "PORT_ALLOWLIST": os.environ["PORT_ALLOWLIST"],
    "MAX_PROBE_TIMEOUT": "10s",
  }
}, open(sys.argv[1], "w"))
PY

echo "==> reachability: switch $FUNCTION_NAME to provided.al2023 + Go env"
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --runtime provided.al2023 \
  --handler bootstrap \
  --timeout 15 \
  --memory-size 256 \
  --environment "file://${ENV_JSON}" \
  --region "$AWS_REGION" \
  --output text \
  --query 'FunctionArn' >/dev/null
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"

echo "==> reachability: update Lambda code from Go zip"
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://${LAMBDA_ZIP}" \
  --region "$AWS_REGION" \
  --output text \
  --query 'FunctionArn'
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"

echo "==> admission-webhook: ensure ECR repo $ECR_REPO"
aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" >/dev/null

echo "==> admission-webhook: push $LOCAL_WEBHOOK_IMAGE -> $ECR_URI:ci"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
DIGEST_TAG="ci-${GITHUB_SHA:-local}"
docker tag "$LOCAL_WEBHOOK_IMAGE" "${ECR_URI}:${DIGEST_TAG}"
docker tag "$LOCAL_WEBHOOK_IMAGE" "${ECR_URI}:latest"
docker push "${ECR_URI}:${DIGEST_TAG}"
docker push "${ECR_URI}:latest"

echo "==> admission-webhook: roll deployment to ${ECR_URI}:${DIGEST_TAG}"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"
kubectl set image "deployment/${WEBHOOK_DEPLOY}" \
  -n "$WEBHOOK_NS" \
  "${WEBHOOK_CONTAINER}=${ECR_URI}:${DIGEST_TAG}"
kubectl rollout status "deployment/${WEBHOOK_DEPLOY}" -n "$WEBHOOK_NS" --timeout=180s

CURRENT_IMAGE="$(kubectl get deployment "$WEBHOOK_DEPLOY" -n "$WEBHOOK_NS" -o jsonpath='{.spec.template.spec.containers[0].image}')"
case "$CURRENT_IMAGE" in
  *pause*)
    echo "error: webhook still on pause image ($CURRENT_IMAGE) after deploy" >&2
    exit 1
    ;;
esac

echo "==> deploy-aws OK"
echo "    reachability lambda: $FUNCTION_NAME"
echo "    webhook image: $CURRENT_IMAGE"
