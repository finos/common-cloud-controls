#!/usr/bin/env bash
# Wait until at least one node is Ready and schedulable.
# kubectl wait --for=condition=Ready does not treat SchedulingDisabled as unschedulable.
# STATUS is the second column: Ready | NotReady | Ready,SchedulingDisabled.
set -euo pipefail

timeout_s="${WAIT_SCHEDULABLE_TIMEOUT:-300}"
deadline=$((SECONDS + timeout_s))
echo "==> admission-webhook: wait for a Ready schedulable node (${timeout_s}s)"
while (( SECONDS < deadline )); do
	if kubectl get nodes --no-headers 2>/dev/null | awk '$2 == "Ready" { found=1 } END { exit !found }'; then
		return 0 2>/dev/null || exit 0
	fi
	sleep 5
done
echo "error: timed out waiting for a Ready schedulable node" >&2
kubectl get nodes -o wide || true
exit 1
