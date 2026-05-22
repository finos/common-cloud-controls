#!/bin/bash
set -euo pipefail

# CCC CFI Compliance Test Runner

# Default values
INSTANCE=""
ENV_FILE=""
SERVICE=""
OUTPUT_DIR=""
TIMEOUT="30m"
RESOURCE_FILTER=""
TAGS=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--instance)
      INSTANCE="$2"
      shift 2
      ;;
    -e|--env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    -s|--service)
      SERVICE="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -r|--resource)
      RESOURCE_FILTER="$2"
      shift 2
      ;;
    -g|--tags)
      TAGS="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Required Options:"
      echo "  -i, --instance INSTANCE_ID           Instance id from environment.yaml (e.g. azure-storage-finos),"
      echo "                                       or resource group name cfi_test_<suffix> (sets INSTANCE_ID)"
      echo ""
      echo "Optional Options:"
      echo "  -e, --env-file PATH                  Path to environment.yaml (default: testing/environment.yaml)"
      echo "  -s, --service SERVICE                Service type to test. If not specified, tests all services in the instance."
      echo "                                       Valid values: object-storage, block-storage, relational-database,"
      echo "                                                     iam, load-balancer, security-group, vpc, logging"
      echo "  -o, --output DIR                     Output directory (default: testing/output)"
      echo "  -r, --resource RESOURCE              Filter to specific resource name"
      echo "  -g, --tags 'TAG1 TAG2 ...'           Space-separated tags ANDed with service tags (e.g., '@CCC.Core.CN01 @Policy')."
      echo "                                       By default @NEGATIVE and @OPT_IN scenarios are excluded."
      echo "                                       Tags are ANDed with the service filter, so include service tags explicitly."
      echo "                                       e.g. for VPC opt-in: '--tags @OPT_IN @CCC.VPC'"
      echo "  -t, --timeout DURATION               Timeout for all tests (default: 30m)"
      echo "  -h, --help                           Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --instance main-aws"
      echo "  $0 --instance main-azure --service object-storage"
      echo "  $0 --instance main-azure --service object-storage --tags '@Behavioural'"
      echo "  $0 --instance main-gcp --tags '@CCC.Core.CN04 @Policy'"
      echo "  $0 --instance main-aws --tags '@OPT_IN'               # run opt-in scenarios explicitly"
      echo "  $0 -e config/azure-storage-finos.yaml -i cfi_test_20260408t161043z"
      echo "  $0 --instance main-aws --env-file /path/to/custom-environment.yaml"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$INSTANCE" ]; then
  echo "Error: --instance is required (e.g. main-aws, main-azure, azure-storage-finos)"
  echo "Use -h or --help for usage information"
  exit 1
fi

# Map resource-group shorthand to INSTANCE_ID + yaml instance id (azure-storage-finos config).
RUNNER_INSTANCE="$INSTANCE"
if [[ "$INSTANCE" == cfi_test_* ]]; then
  export INSTANCE_ID="${INSTANCE#cfi_test_}"
  RUNNER_INSTANCE="azure-storage-finos"
  echo "   INSTANCE_ID=$INSTANCE_ID (from resource group prefix)"
elif [[ -n "$ENV_FILE" && "$ENV_FILE" == *azure-storage-finos* && "$INSTANCE" != "azure-storage-finos" ]]; then
  export INSTANCE_ID="$INSTANCE"
  RUNNER_INSTANCE="azure-storage-finos"
  echo "   INSTANCE_ID=$INSTANCE_ID"
fi

# Default service for FINOS Azure storage config
if [[ -z "$SERVICE" && -n "$ENV_FILE" && "$ENV_FILE" == *azure-storage-finos* ]]; then
  SERVICE="object-storage"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODULES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export GOWORK="$MODULES_DIR/go.work"

# Build workspace libraries in dependency order, then the runner binary.
# Note: cfi-testing is excluded from "go build ./..." — package main lives in runner/
# and Go would try to write a binary named "runner" next to the runner/ directory.
echo "🔨 Building Go workspace (modules/go.work)..."
BUILD_MODULES=(cloud-api cloud-testing-dsl reporters)
for mod in "${BUILD_MODULES[@]}"; do
  echo "   → $mod"
  if ! (cd "$MODULES_DIR/$mod" && go build ./...); then
    echo "❌ Build failed: $mod"
    exit 1
  fi
done

echo "   → cfi-testing (runner)"
cd "$SCRIPT_DIR"
if ! go build -o ccc-compliance ./runner/; then
  echo "❌ Build failed: cfi-testing runner"
  exit 1
fi

echo "✅ Build successful"
echo ""

# Build the command
CMD="./ccc-compliance -instance=\"$RUNNER_INSTANCE\" -timeout=\"$TIMEOUT\""

if [ -n "$ENV_FILE" ]; then
  CMD="$CMD -env-file=\"$ENV_FILE\""
fi

if [ -n "$SERVICE" ]; then
  CMD="$CMD -service=\"$SERVICE\""
fi

if [ -n "$OUTPUT_DIR" ]; then
  CMD="$CMD -output=\"$OUTPUT_DIR\""
fi

if [ -n "$RESOURCE_FILTER" ]; then
  CMD="$CMD -resource=\"$RESOURCE_FILTER\""
fi

if [ -n "$TAGS" ]; then
  CMD="$CMD -tags=\"$TAGS\""
fi

# Execute the command
echo "🚀 Running compliance tests..."
eval $CMD

exit $?
