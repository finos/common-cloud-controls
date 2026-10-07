#!/usr/bin/env bash
# Deploy built admission-webhook probe image into the Azure integration AKS estate.
# Prerequisites: ./modules/probes/build.sh ; az login ; cluster reachable.
# Usage:
#   ./modules/probes/deploy-azure.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEBHOOK_NS="${WEBHOOK_PROBE_NAMESPACE:-ccc-admission-webhook-probe}"
WEBHOOK_DEPLOY="${WEBHOOK_PROBE_DEPLOYMENT:-ccc-admission-webhook-probe}"
WEBHOOK_CONTAINER="${WEBHOOK_PROBE_CONTAINER:-webhook}"
LOCAL_WEBHOOK_IMAGE="${WEBHOOK_PROBE_IMAGE:-finos-ccc-admission-webhook-probe:local}"
ACR_NAME="${WEBHOOK_ACR_NAME:-finoscccintacr}"
ACR_REPO="${WEBHOOK_ACR_REPO:-finos-ccc-admission-webhook-probe}"
CLUSTER_NAME="${AKS_CLUSTER_NAME:-finos-ccc-integration-k8s-main}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-finos-ccc-integration-rg}"

if ! docker image inspect "$LOCAL_WEBHOOK_IMAGE" >/dev/null 2>&1; then
  echo "error: missing local image $LOCAL_WEBHOOK_IMAGE — run modules/probes/build.sh first" >&2
  exit 1
fi

echo "==> admission-webhook: ensure ACR $ACR_NAME in $RESOURCE_GROUP"
if ! az acr show --name "$ACR_NAME" >/dev/null 2>&1; then
  az acr create \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --sku Basic \
    --admin-enabled false >/dev/null
fi
ACR_LOGIN_SERVER="$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)"
REMOTE_IMAGE="${ACR_LOGIN_SERVER}/${ACR_REPO}"
DIGEST_TAG="ci-${GITHUB_SHA:-local}"

echo "==> admission-webhook: login to ACR $ACR_NAME"
az acr login --name "$ACR_NAME"

echo "==> admission-webhook: push $LOCAL_WEBHOOK_IMAGE -> ${REMOTE_IMAGE}:${DIGEST_TAG}"
docker tag "$LOCAL_WEBHOOK_IMAGE" "${REMOTE_IMAGE}:${DIGEST_TAG}"
docker tag "$LOCAL_WEBHOOK_IMAGE" "${REMOTE_IMAGE}:latest"
docker push "${REMOTE_IMAGE}:${DIGEST_TAG}"
docker push "${REMOTE_IMAGE}:latest"
PUSHED_DIGEST="$(az acr repository show --name "$ACR_NAME" --image "${ACR_REPO}:${DIGEST_TAG}" --query digest -o tsv)"
PINNED_IMAGE="${REMOTE_IMAGE}@${PUSHED_DIGEST}"

echo "==> admission-webhook: roll AKS deployment to ${PINNED_IMAGE}"
# AAD-enabled AKS (local accounts disabled) requires kubelogin for kubectl.
if ! command -v kubelogin >/dev/null 2>&1; then
  echo "==> admission-webhook: install kubelogin"
  BIN_DIR="${HOME}/.local/bin"
  mkdir -p "$BIN_DIR"
  az aks install-cli \
    --install-location "${BIN_DIR}/kubectl" \
    --kubelogin-install-location "${BIN_DIR}/kubelogin"
  export PATH="${BIN_DIR}:${PATH}"
fi
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing
# Prefer Azure CLI credential (az login / OIDC) over interactive device code.
kubelogin convert-kubeconfig -l azurecli
# AKS needs pull rights for the ACR holding the probe image.
az aks update -g "$RESOURCE_GROUP" -n "$CLUSTER_NAME" --attach-acr "$ACR_NAME" >/dev/null 2>&1 || true
echo "==> admission-webhook: wait for Ready nodes"
kubectl wait --for=condition=Ready nodes --all --timeout=300s
kubectl patch "deployment/${WEBHOOK_DEPLOY}" -n "$WEBHOOK_NS" \
  --type merge -p '{"spec":{"progressDeadlineSeconds":600}}' >/dev/null
kubectl set image "deployment/${WEBHOOK_DEPLOY}" \
  -n "$WEBHOOK_NS" \
  "${WEBHOOK_CONTAINER}=${PINNED_IMAGE}"
kubectl scale "deployment/${WEBHOOK_DEPLOY}" -n "$WEBHOOK_NS" --replicas=1
kubectl rollout status "deployment/${WEBHOOK_DEPLOY}" -n "$WEBHOOK_NS" --timeout=180s

CURRENT_IMAGE="$(kubectl get deployment "$WEBHOOK_DEPLOY" -n "$WEBHOOK_NS" -o jsonpath='{.spec.template.spec.containers[0].image}')"
case "$CURRENT_IMAGE" in
  *pause*)
    echo "error: webhook still on pause image ($CURRENT_IMAGE) after deploy" >&2
    exit 1
    ;;
esac

echo "==> deploy-azure OK"
echo "    webhook image: $CURRENT_IMAGE"
