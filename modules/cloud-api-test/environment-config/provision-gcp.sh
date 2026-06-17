#!/usr/bin/env bash
# Idempotent: reuses service accounts and key files; refreshes gcp-env.sh.
# Run: ./modules/cloud-api-test/environment-config/provision-gcp.sh
# Use ROTATE_KEYS=1 to create new SA keys.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

OUT_FILE="$SCRIPT_DIR/gcp-env.sh"
STALE_VERSION_ID="${STALE_VERSION_ID:-1}"
KEY_DIR="$SCRIPT_DIR/.keys"
mkdir -p "$KEY_DIR"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "error: gcloud CLI is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [[ -z "${PROJECT_ID:-}" || "$PROJECT_ID" == "(unset)" ]]; then
  echo "error: set GCP_PROJECT_ID or run 'gcloud config set project <id>'" >&2
  exit 1
fi

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
if [[ -z "$PROJECT_NUMBER" ]]; then
  echo "error: unable to resolve project number for $PROJECT_ID" >&2
  exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
  echo "error: run 'gcloud auth login' first" >&2
  exit 1
fi

INSTANCE_ID="${INSTANCE_ID:-}"
if [[ -z "$INSTANCE_ID" ]]; then
  existing_email="$(read_env_export "$OUT_FILE" "GCP_TEST_USER_NO_ACCESS_NAME" || true)"
  if [[ -n "$existing_email" && "$existing_email" =~ ^cfi-([^@]+)-no-access@ ]]; then
    INSTANCE_ID="${BASH_REMATCH[1]}"
    echo "==> Reusing instance id from $OUT_FILE: $INSTANCE_ID"
  fi
fi
INSTANCE_ID="${INSTANCE_ID:-integration}"

SA_NO_ACCESS_ID="${SA_NO_ACCESS_ID:-cfi-${INSTANCE_ID}-no-access}"
SA_WRITE_ID="${SA_WRITE_ID:-cfi-${INSTANCE_ID}-write}"
SA_ADMIN_ID="${SA_ADMIN_ID:-cfi-${INSTANCE_ID}-admin}"

SA_NO_ACCESS_EMAIL="${SA_NO_ACCESS_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
SA_WRITE_EMAIL="${SA_WRITE_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
SA_ADMIN_EMAIL="${SA_ADMIN_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

NO_ACCESS_KEY_FILE="$KEY_DIR/${SA_NO_ACCESS_ID}.json"
WRITE_KEY_FILE="$KEY_DIR/${SA_WRITE_ID}.json"
ADMIN_KEY_FILE="$KEY_DIR/${SA_ADMIN_ID}.json"

ensure_sa() {
  local sa_id="$1" display_name="$2"
  if gcloud iam service-accounts describe "${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Reusing service account: $sa_id"
  else
    echo "Creating service account: $sa_id"
    gcloud iam service-accounts create "$sa_id" \
      --project "$PROJECT_ID" \
      --display-name "$display_name" \
      --description "CCC behavioural integration test identity" >/dev/null
  fi
}

ensure_binding() {
  local member="$1" role="$2"
  if gcloud projects get-iam-policy "$PROJECT_ID" \
    --flatten="bindings[].members" \
    --filter="bindings.role:$role AND bindings.members:serviceAccount:${member}" \
    --format="value(bindings.role)" 2>/dev/null | grep -q .; then
    echo "Role already bound: $role -> $member"
    return 0
  fi
  echo "Ensuring role binding: $role -> $member"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:${member}" \
    --role "$role" \
    --quiet >/dev/null
}

create_key() {
  local sa_email="$1" key_file="$2"
  local rotate="${ROTATE_KEYS:-0}"

  if [[ -f "$key_file" && "$rotate" != "1" ]]; then
    echo "Reusing existing key file: $key_file"
    return
  fi

  if [[ "$rotate" == "1" ]]; then
    rm -f "$key_file"
  fi

  echo "Creating key for $sa_email"
  gcloud iam service-accounts keys create "$key_file" \
    --iam-account "$sa_email" \
    --project "$PROJECT_ID" >/dev/null
}

json_for_env() {
  jq -c . "$1"
}

guess_vm_hostname() {
  if [[ -n "${GCP_VM_HOSTNAME:-}" ]]; then
    echo "$GCP_VM_HOSTNAME"
    return
  fi
  local tfstate="$SCRIPT_DIR/../terraform/gcp/terraform.tfstate"
  if [[ -f "$tfstate" ]] && command -v jq >/dev/null 2>&1; then
    local from_state
    from_state="$(jq -r '.outputs.virtual_machines.value.host_name // empty' "$tfstate" | tr -d '\n')"
    if [[ -n "$from_state" ]]; then
      echo "$from_state"
      return
    fi
  fi
  local vm_name
  vm_name="$(gcloud compute instances list \
    --project "$PROJECT_ID" \
    --format='value(name)' \
    --filter='name~finos-ccc-integration-vm-main' 2>/dev/null | head -n 1 || true)"
  echo "${vm_name:-finos-ccc-integration-vm-main}"
}

ensure_sa "$SA_NO_ACCESS_ID" "CFI Test No Access"
ensure_sa "$SA_WRITE_ID" "CFI Test Write"
ensure_sa "$SA_ADMIN_ID" "CFI Test Admin"

ensure_binding "$SA_WRITE_EMAIL" "roles/cloudfunctions.developer"
ensure_binding "$SA_WRITE_EMAIL" "roles/compute.instanceAdmin.v1"
ensure_binding "$SA_ADMIN_EMAIL" "roles/editor"

create_key "$SA_NO_ACCESS_EMAIL" "$NO_ACCESS_KEY_FILE"
create_key "$SA_WRITE_EMAIL" "$WRITE_KEY_FILE"
create_key "$SA_ADMIN_EMAIL" "$ADMIN_KEY_FILE"

NO_ACCESS_KEY_JSON="$(json_for_env "$NO_ACCESS_KEY_FILE")"
WRITE_KEY_JSON="$(json_for_env "$WRITE_KEY_FILE")"
ADMIN_KEY_JSON="$(json_for_env "$ADMIN_KEY_FILE")"
VM_HOSTNAME="$(guess_vm_hostname)"

{
  echo "# Generated by provision-gcp.sh — do not commit."
  echo "# Source: source modules/cloud-api-test/environment-config/gcp-env.sh"
  echo "# Re-run after terraform apply to refresh fixture vars (SAs/keys reused unless ROTATE_KEYS=1)."
  echo ""
  printf 'export GCP_PROJECT_ID=%q\n' "$PROJECT_ID"
  printf 'export GCP_PROJECT_NUMBER=%q\n' "$PROJECT_NUMBER"
  echo ""
  printf 'export GCP_TEST_USER_NO_ACCESS_NAME=%q\n' "$SA_NO_ACCESS_EMAIL"
  printf "export GCP_TEST_USER_NO_ACCESS_SA_KEY_JSON='%s'\n" "$NO_ACCESS_KEY_JSON"
  echo ""
  printf 'export GCP_TEST_USER_WRITE_NAME=%q\n' "$SA_WRITE_EMAIL"
  printf "export GCP_TEST_USER_WRITE_SA_KEY_JSON='%s'\n" "$WRITE_KEY_JSON"
  echo ""
  printf 'export GCP_TEST_USER_ADMIN_NAME=%q\n' "$SA_ADMIN_EMAIL"
  printf "export GCP_TEST_USER_ADMIN_SA_KEY_JSON='%s'\n" "$ADMIN_KEY_JSON"
  echo ""
  printf 'export GCP_VM_HOSTNAME=%q\n' "$VM_HOSTNAME"
  printf 'export STALE_VERSION_ID=%q\n' "$STALE_VERSION_ID"
  echo ""
} >"$OUT_FILE"

chmod 600 "$OUT_FILE"
echo "Wrote $OUT_FILE"
