#!/usr/bin/env bash
# Wait until at least one node is Ready and schedulable.
# kubectl wait --for=condition=Ready does not check spec.unschedulable.
set -euo pipefail

timeout_s="${WAIT_SCHEDULABLE_TIMEOUT:-300}"
deadline=$((SECONDS + timeout_s))
echo "==> admission-webhook: wait for a Ready schedulable node (${timeout_s}s)"
while (( SECONDS < deadline )); do
	found=0
	while IFS=$'\t' read -r name unsched ready; do
		[ -z "${name:-}" ] && continue
		if [ "${ready}" = "True" ] && [ "${unsched}" != "true" ]; then
			found=1
			break
		fi
	done < <(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.unschedulable}{"\t"}{range .status.conditions[?(@.type=="Ready")]}{.status}{end}{"\n"}{end}' 2>/dev/null || true)
	if [ "${found}" = "1" ]; then
		return 0 2>/dev/null || exit 0
	fi
	sleep 5
done
echo "error: timed out waiting for a Ready schedulable node" >&2
kubectl get nodes -o wide || true
exit 1
