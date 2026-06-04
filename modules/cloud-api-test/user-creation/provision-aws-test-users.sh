#!/usr/bin/env bash
# Creates behavioural-test IAM users and writes gitignored aws-env.sh.
# Run from anywhere:
#   ./modules/cloud-api-test/user-creation/provision-aws-test-users.sh
# Then:
#   source modules/cloud-api-test/user-creation/aws-env.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_FILE="$SCRIPT_DIR/aws-env.sh"
KEY_DIR="$SCRIPT_DIR/.keys"
mkdir -p "$KEY_DIR"

if ! command -v aws >/dev/null 2>&1; then
  echo "error: AWS CLI (aws) is required" >&2
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "error: configure AWS credentials first (e.g. aws configure or OIDC)" >&2
  exit 1
fi

AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}"
if [ -z "${AWS_REGION:-}" ]; then
  AWS_REGION="us-east-1"
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "None" ]; then
  echo "error: unable to resolve AWS account id" >&2
  exit 1
fi

INSTANCE_ID="${INSTANCE_ID:-$(date -u +"%Y%m%dt%H%M%Sz")}"
USER_NO_ACCESS="${USER_NO_ACCESS:-cfi-${INSTANCE_ID}-no-access}"
USER_WRITE="${USER_WRITE:-cfi-${INSTANCE_ID}-write}"
USER_ADMIN="${USER_ADMIN:-cfi-${INSTANCE_ID}-admin}"

NO_ACCESS_KEY_FILE="$KEY_DIR/${USER_NO_ACCESS}.credentials"
WRITE_KEY_FILE="$KEY_DIR/${USER_WRITE}.credentials"
ADMIN_KEY_FILE="$KEY_DIR/${USER_ADMIN}.credentials"

# Managed policies for write/admin (broad, matching GCP integration fixture roles).
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
  local user_name="$1"
  local arn policy_arn

  arn="$(aws iam list-attached-user-policies --user-name "$user_name" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || true)"
  for policy_arn in $arn; do
    [ -z "$policy_arn" ] || [ "$policy_arn" = "None" ] && continue
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
  local user_name="$1"
  local key_file="$2"
  local rotate="${ROTATE_KEYS:-0}"
  local access_key_id secret_access_key existing_id

  if [ -f "$key_file" ] && [ "$rotate" != "1" ]; then
    echo "Reusing existing key file: $key_file"
    # shellcheck source=/dev/null
    source "$key_file"
    ACCESS_KEY_ID_RESULT="$access_key_id"
    SECRET_ACCESS_KEY_RESULT="$secret_access_key"
    return
  fi

  if [ "$rotate" = "1" ]; then
    rm -f "$key_file"
    existing_id="$(aws iam list-access-keys --user-name "$user_name" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null || true)"
    for existing_id in $existing_id; do
      [ -z "$existing_id" ] || [ "$existing_id" = "None" ] && continue
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
  if [ -z "$access_key_id" ] || [ -z "$secret_access_key" ]; then
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
  local env_prefix="$1"
  local user_name="$2"
  local access_key_id="$3"
  local secret_access_key="$4"

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
  echo "# Generated by provision-aws-test-users.sh — do not commit."
  echo "# Source before running integration / behavioural tests:"
  echo "#   source modules/cloud-api-test/user-creation/aws-env.sh"
  echo ""
  printf 'export AWS_REGION=%q\n' "$AWS_REGION"
  printf 'export AWS_ACCOUNT_ID=%q\n' "$ACCOUNT_ID"
  echo ""
} >"$OUT_FILE"

create_access_key "$USER_NO_ACCESS" "$NO_ACCESS_KEY_FILE"
write_identity_exports "AWS_TEST_USER_NO_ACCESS" "$USER_NO_ACCESS" "$ACCESS_KEY_ID_RESULT" "$SECRET_ACCESS_KEY_RESULT"

create_access_key "$USER_WRITE" "$WRITE_KEY_FILE"
write_identity_exports "AWS_TEST_USER_WRITE" "$USER_WRITE" "$ACCESS_KEY_ID_RESULT" "$SECRET_ACCESS_KEY_RESULT"

create_access_key "$USER_ADMIN" "$ADMIN_KEY_FILE"
write_identity_exports "AWS_TEST_USER_ADMIN" "$USER_ADMIN" "$ACCESS_KEY_ID_RESULT" "$SECRET_ACCESS_KEY_RESULT"

{
  echo "# GitHub secrets helper (optional):"
  echo "# gh secret set AWS_ENV < $OUT_FILE --repo finos/common-cloud-controls"
} >>"$OUT_FILE"

chmod 600 "$OUT_FILE"

echo "Wrote $OUT_FILE"
echo "IAM users:"
echo "  - $USER_NO_ACCESS (no policies)"
echo "  - $USER_WRITE (${#WRITE_POLICIES[@]} managed policies)"
echo "  - $USER_ADMIN ($ADMIN_POLICY)"
echo "Credential files (keep secure):"
echo "  - $NO_ACCESS_KEY_FILE"
echo "  - $WRITE_KEY_FILE"
echo "  - $ADMIN_KEY_FILE"
