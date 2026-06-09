#!/usr/bin/env bash
# Idempotent: reuses existing IAM users and access keys; refreshes aws-env.sh (incl. STALE_VERSION_ID).
# Run from anywhere:
#   ./modules/cloud-api-test/environment-config/provision-aws.sh
# Then:
#   source modules/cloud-api-test/environment-config/aws-env.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

OUT_FILE="$SCRIPT_DIR/aws-env.sh"
TFSTATE="$SCRIPT_DIR/../terraform/aws/terraform.tfstate"
KEY_DIR="$SCRIPT_DIR/.keys"
mkdir -p "$KEY_DIR"

STALE_VERSION_ID="${STALE_VERSION_ID:-}"
if [[ -z "$STALE_VERSION_ID" && -f "$TFSTATE" ]] && command -v jq >/dev/null 2>&1; then
  STALE_VERSION_ID="$(jq -r '.outputs.secrets.value.stale_version_id // empty' "$TFSTATE" | tr -d '\n')"
fi
if [[ -z "$STALE_VERSION_ID" ]]; then
  echo "error: STALE_VERSION_ID unset — apply terraform/aws secrets module or export STALE_VERSION_ID" >&2
  exit 1
fi

GENAI_GUARDRAIL_ID="${GENAI_GUARDRAIL_ID:-}"
if [[ -z "$GENAI_GUARDRAIL_ID" && -f "$TFSTATE" ]] && command -v jq >/dev/null 2>&1; then
  GENAI_GUARDRAIL_ID="$(jq -r '.outputs.gen_ai.value.guardrail_id // empty' "$TFSTATE" | tr -d '\n')"
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "error: AWS CLI (aws) is required" >&2
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "error: configure AWS credentials first (e.g. aws configure or OIDC)" >&2
  exit 1
fi

AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
AWS_REGION="${AWS_REGION:-us-east-1}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
if [[ -z "$ACCOUNT_ID" || "$ACCOUNT_ID" == "None" ]]; then
  echo "error: unable to resolve AWS account id" >&2
  exit 1
fi

INSTANCE_ID="${INSTANCE_ID:-}"
if [[ -z "$INSTANCE_ID" ]]; then
  existing_user="$(read_env_export "$OUT_FILE" "AWS_TEST_USER_NO_ACCESS_USER_NAME" || true)"
  if [[ -n "$existing_user" && "$existing_user" =~ ^cfi-(.+)-no-access$ ]]; then
    INSTANCE_ID="${BASH_REMATCH[1]}"
    echo "==> Reusing instance id from $OUT_FILE: $INSTANCE_ID"
  fi
fi
INSTANCE_ID="${INSTANCE_ID:-integration}"

USER_NO_ACCESS="${USER_NO_ACCESS:-$(read_env_export "$OUT_FILE" "AWS_TEST_USER_NO_ACCESS_USER_NAME" 2>/dev/null || echo "cfi-${INSTANCE_ID}-no-access")}"
USER_WRITE="${USER_WRITE:-$(read_env_export "$OUT_FILE" "AWS_TEST_USER_WRITE_USER_NAME" 2>/dev/null || echo "cfi-${INSTANCE_ID}-write")}"
USER_ADMIN="${USER_ADMIN:-$(read_env_export "$OUT_FILE" "AWS_TEST_USER_ADMIN_USER_NAME" 2>/dev/null || echo "cfi-${INSTANCE_ID}-admin")}"

NO_ACCESS_KEY_FILE="$KEY_DIR/${USER_NO_ACCESS}.credentials"
WRITE_KEY_FILE="$KEY_DIR/${USER_WRITE}.credentials"
ADMIN_KEY_FILE="$KEY_DIR/${USER_ADMIN}.credentials"

WRITE_POLICIES=(
  "arn:aws:iam::aws:policy/AWSLambda_FullAccess"
  "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
  "arn:aws:iam::aws:policy/AmazonS3FullAccess"
)
ADMIN_POLICY="arn:aws:iam::aws:policy/PowerUserAccess"

ensure_user() {
  local user_name="$1"
  if aws iam get-user --user-name "$user_name" >/dev/null 2>&1; then
    echo "Reusing IAM user: $user_name"
  else
    echo "Creating IAM user: $user_name"
    aws iam create-user --user-name "$user_name" >/dev/null
  fi
}

detach_all_user_policies() {
  local user_name="$1" arn policy_arn
  arn="$(aws iam list-attached-user-policies --user-name "$user_name" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || true)"
  for policy_arn in $arn; do
    [[ -z "$policy_arn" || "$policy_arn" == "None" ]] && continue
    aws iam detach-user-policy --user-name "$user_name" --policy-arn "$policy_arn" >/dev/null
  done
}

attach_policies() {
  local user_name="$1"
  shift
  local policy_arn
  for policy_arn in "$@"; do
    if aws iam list-attached-user-policies \
      --user-name "$user_name" \
      --query "AttachedPolicies[?PolicyArn=='$policy_arn'].PolicyArn" \
      --output text | grep -q .; then
      echo "Policy already attached: $policy_arn -> $user_name"
    else
      echo "Attaching policy: $policy_arn -> $user_name"
      aws iam attach-user-policy --user-name "$user_name" --policy-arn "$policy_arn" >/dev/null
    fi
  done
}

create_access_key() {
  local user_name="$1" key_file="$2"
  local rotate="${ROTATE_KEYS:-0}" access_key_id secret_access_key existing_id

  if [[ -f "$key_file" && "$rotate" != "1" ]]; then
    echo "Reusing existing key file: $key_file"
    # shellcheck source=/dev/null
    source "$key_file"
    ACCESS_KEY_ID_RESULT="$access_key_id"
    SECRET_ACCESS_KEY_RESULT="$secret_access_key"
    return
  fi

  if [[ "$rotate" == "1" ]]; then
    rm -f "$key_file"
    existing_id="$(aws iam list-access-keys --user-name "$user_name" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null || true)"
    for existing_id in $existing_id; do
      [[ -z "$existing_id" || "$existing_id" == "None" ]] && continue
      echo "Deleting access key $existing_id for $user_name"
      aws iam delete-access-key --user-name "$user_name" --access-key-id "$existing_id" >/dev/null
    done
  fi

  echo "Creating access key for $user_name"
  read -r access_key_id secret_access_key < <(
    aws iam create-access-key --user-name "$user_name" \
      --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
      --output text
  )
  if [[ -z "$access_key_id" || -z "$secret_access_key" ]]; then
    echo "error: failed to create access key for $user_name" >&2
    exit 1
  fi
  {
    printf 'access_key_id=%q\n' "$access_key_id"
    printf 'secret_access_key=%q\n' "$secret_access_key"
  } >"$key_file"
  chmod 600 "$key_file"
  ACCESS_KEY_ID_RESULT="$access_key_id"
  SECRET_ACCESS_KEY_RESULT="$secret_access_key"
}

write_identity_exports() {
  local env_prefix="$1" user_name="$2" access_key_id="$3" secret_access_key="$4"
  {
    printf 'export %s_USER_NAME=%q\n' "$env_prefix" "$user_name"
    printf 'export %s_ACCESS_KEY_ID=%q\n' "$env_prefix" "$access_key_id"
    printf 'export %s_SECRET_ACCESS_KEY=%q\n' "$env_prefix" "$secret_access_key"
    printf 'export %s_SESSION_TOKEN=%q\n' "$env_prefix" ""
    echo ""
  } >>"$OUT_FILE"
}

ensure_user "$USER_NO_ACCESS"
ensure_user "$USER_WRITE"
ensure_user "$USER_ADMIN"

detach_all_user_policies "$USER_NO_ACCESS"
detach_all_user_policies "$USER_WRITE"
detach_all_user_policies "$USER_ADMIN"

attach_policies "$USER_WRITE" "${WRITE_POLICIES[@]}"
attach_policies "$USER_ADMIN" "$ADMIN_POLICY"

{
  echo "# Generated by provision-aws.sh — do not commit."
  echo "# Source: source modules/cloud-api-test/environment-config/aws-env.sh"
  echo "# Re-run after terraform apply to refresh STALE_VERSION_ID (users/keys reused unless ROTATE_KEYS=1)."
  echo ""
  printf 'export AWS_REGION=%q\n' "$AWS_REGION"
  printf 'export AWS_ACCOUNT_ID=%q\n' "$ACCOUNT_ID"
  printf 'export STALE_VERSION_ID=%q\n' "$STALE_VERSION_ID"
  if [[ -n "$GENAI_GUARDRAIL_ID" ]]; then
    printf 'export GENAI_GUARDRAIL_ID=%q\n' "$GENAI_GUARDRAIL_ID"
  fi
  echo ""
} >"$OUT_FILE"

create_access_key "$USER_NO_ACCESS" "$NO_ACCESS_KEY_FILE"
write_identity_exports "AWS_TEST_USER_NO_ACCESS" "$USER_NO_ACCESS" "$ACCESS_KEY_ID_RESULT" "$SECRET_ACCESS_KEY_RESULT"

create_access_key "$USER_WRITE" "$WRITE_KEY_FILE"
write_identity_exports "AWS_TEST_USER_WRITE" "$USER_WRITE" "$ACCESS_KEY_ID_RESULT" "$SECRET_ACCESS_KEY_RESULT"

create_access_key "$USER_ADMIN" "$ADMIN_KEY_FILE"
write_identity_exports "AWS_TEST_USER_ADMIN" "$USER_ADMIN" "$ACCESS_KEY_ID_RESULT" "$SECRET_ACCESS_KEY_RESULT"

chmod 600 "$OUT_FILE"
echo "Wrote $OUT_FILE"
