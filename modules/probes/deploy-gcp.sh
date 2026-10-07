#!/usr/bin/env bash
# Deploy built admission-webhook probe image into the GCP integration GKE estate.
# Prerequisites: ./modules/probes/build.sh ; gcloud auth ; cluster reachable.
# Usage:
#   ./modules/probes/deploy-gcp.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEBHOOK_NS="${WEBHOOK_PROBE_NAMESPACE:-ccc-admission-webhook-probe}"
WEBHOOK_DEPLOY="${WEBHOOK_PROBE_DEPLOYMENT:-ccc-admission-webhook-probe}"
WEBHOOK_CONTAINER="${WEBHOOK_PROBE_CONTAINER:-webhook}"
LOCAL_WEBHOOK_IMAGE="${WEBHOOK_PROBE_IMAGE:-finos-ccc-admission-webhook-probe:local}"
PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
REGION="${GCP_REGION:-${GOOGLE_CLOUD_REGION:-us-central1}}"
AR_REPO="${WEBHOOK_AR_REPO:-finos-ccc-probes}"
IMAGE_NAME="${WEBHOOK_AR_IMAGE:-finos-ccc-admission-webhook-probe}"
CLUSTER_NAME="${GKE_CLUSTER_NAME:-finos-ccc-integration-k8s-main}"

if ! docker image inspect "$LOCAL_WEBHOOK_IMAGE" >/dev/null 2>&1; then
  echo "error: missing local image $LOCAL_WEBHOOK_IMAGE — run modules/probes/build.sh first" >&2
  exit 1
fi

REMOTE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}"
DIGEST_TAG="ci-${GITHUB_SHA:-local}"

echo "==> admission-webhook: ensure Artifact Registry repo $AR_REPO in $REGION"
if ! gcloud artifacts repositories describe "$AR_REPO" \
  --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --description="FINOS CCC integration probe images"
fi

echo "==> admission-webhook: grant GKE node SA Artifact Registry reader (best-effort)"
# CI runner (gha-deployer) often lacks artifactregistry.repositories.setIamPolicy;
# node AR reader is provisioned in terraform (google_project_iam_member.node_ar_reader).
NODE_SA="$(gcloud container clusters describe "$CLUSTER_NAME" \
  --region "$REGION" --project "$PROJECT_ID" \
  --format='value(nodeConfig.serviceAccount)' 2>/dev/null || true)"
if [[ -z "$NODE_SA" || "$NODE_SA" == "default" ]]; then
  ZONE="$(gcloud container clusters list --project="$PROJECT_ID" \
    --filter="name=${CLUSTER_NAME}" --format='value(location)' | head -n1)"
  NODE_SA="$(gcloud container clusters describe "$CLUSTER_NAME" \
    --zone "$ZONE" --project "$PROJECT_ID" \
    --format='value(nodeConfig.serviceAccount)' 2>/dev/null || true)"
fi
if [[ -z "$NODE_SA" || "$NODE_SA" == "default" ]]; then
  PROJECT_NUM="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  NODE_SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"
fi
if ! gcloud artifacts repositories add-iam-policy-binding "$AR_REPO" \
  --location="$REGION" --project="$PROJECT_ID" \
  --member="serviceAccount:${NODE_SA}" \
  --role="roles/artifactregistry.reader" >/dev/null 2>&1; then
  echo "warning: could not bind roles/artifactregistry.reader for ${NODE_SA} on ${AR_REPO}" >&2
  echo "warning: continuing; ensure terraform node_ar_reader (or equivalent) is applied" >&2
fi

echo "==> admission-webhook: configure docker auth for ${REGION}-docker.pkg.dev"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "==> admission-webhook: push $LOCAL_WEBHOOK_IMAGE -> ${REMOTE_IMAGE}:${DIGEST_TAG}"
docker tag "$LOCAL_WEBHOOK_IMAGE" "${REMOTE_IMAGE}:${DIGEST_TAG}"
docker tag "$LOCAL_WEBHOOK_IMAGE" "${REMOTE_IMAGE}:latest"
docker push "${REMOTE_IMAGE}:${DIGEST_TAG}"
docker push "${REMOTE_IMAGE}:latest"
PUSHED_DIGEST="$(gcloud artifacts docker images describe "${REMOTE_IMAGE}:${DIGEST_TAG}" \
  --format='get(image_summary.digest)' --project="$PROJECT_ID")"
PINNED_IMAGE="${REMOTE_IMAGE}@${PUSHED_DIGEST}"

echo "==> admission-webhook: roll GKE deployment to ${PINNED_IMAGE}"
# kubectl against GKE requires the gke-gcloud-auth-plugin exec credential helper.
if ! command -v gke-gcloud-auth-plugin >/dev/null 2>&1; then
  echo "==> admission-webhook: install gke-gcloud-auth-plugin"
  if gcloud components install gke-gcloud-auth-plugin --quiet 2>/dev/null; then
    :
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq google-cloud-cli-gke-gcloud-auth-plugin
  else
    echo "error: gke-gcloud-auth-plugin missing; install via gcloud components or apt" >&2
    exit 1
  fi
fi
export USE_GKE_GCLOUD_AUTH_PLUGIN=True
# Cluster may be zonal or regional; try region first then fall back to zone list.
if ! gcloud container clusters get-credentials "$CLUSTER_NAME" \
  --region "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  ZONE="$(gcloud container clusters list --project="$PROJECT_ID" \
    --filter="name=${CLUSTER_NAME}" --format='value(location)' | head -n1)"
  if [[ -z "$ZONE" ]]; then
    echo "error: GKE cluster $CLUSTER_NAME not found in project $PROJECT_ID" >&2
    exit 1
  fi
  gcloud container clusters get-credentials "$CLUSTER_NAME" \
    --zone "$ZONE" --project "$PROJECT_ID"
fi

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

echo "==> deploy-gcp OK"
echo "    webhook image: $CURRENT_IMAGE"
