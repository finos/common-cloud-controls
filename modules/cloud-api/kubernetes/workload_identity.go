package kubernetes

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apiresource "k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ErrCloudAccessDenied marks a workload cloud call that reached the cloud API
// (or its token exchange) and was refused. Callers can distinguish it from
// infrastructure failures with errors.Is.
var ErrCloudAccessDenied = errors.New("cloud API access denied")

const (
	wiProbeResultPrefix = "CCC_WI_RESULT="
	wiProbeActionRead   = "probe-read"
)

// wiProbeDefaultImages are overridable with wi-probe-image. Pin by digest where
// the target namespace enforces digest-pinned images (ccc-deny-tag-only-images).
var wiProbeDefaultImages = map[string]string{
	"aws":   "amazon/aws-cli@sha256:643507c10ada7964ca6157b3d799f030b90577643da9955d319a77399ed80d73",
	"azure": "mcr.microsoft.com/azure-cli@sha256:2d18d025d51e28e790855a8666fab5b7672f2aa62210bca3a75c1f3fd9b68e25",
	"gcp":   "curlimages/curl@sha256:c1fe1679c34d9784c1b0d1e5f62ac0a79fca01fb6377cdd33e90473c6f9f9a69",
}

func wiProbeCPURequest(provider string) string {
	if provider == "azure" {
		// Keep small: single-node AKS fixtures often have little allocatable CPU left.
		return "50m"
	}
	return "50m"
}

func wiProbeCPULimit(provider string) string {
	if provider == "azure" {
		return "200m"
	}
	return "200m"
}

func wiProbeMemoryRequest(provider string) string {
	if provider == "azure" {
		return "512Mi"
	}
	return "64Mi"
}

func wiProbeMemoryLimit(provider string) string {
	// azure-cli OOMs at 128Mi (LimitRange default) and still at 512Mi during federated login.
	if provider == "azure" {
		return "1Gi"
	}
	return "256Mi"
}

// AttemptCloudAPIAsWorkload runs a short Job under serviceAccount that reads the
// fixture workload-identity probe object (wi-probe-resource) with whatever cloud
// credentials the workload identity integration gives that service account.
//
// Result.Succeeded is true only when the object was read and its content matched
// wi-probe-expected. An access-denied outcome returns Denied=true and an error
// wrapping ErrCloudAccessDenied; any other failure returns Denied=false and a
// plain error, so an unbound service account cannot "pass" on infrastructure noise.
func (s *managedService) AttemptCloudAPIAsWorkload(clusterID, namespace, serviceAccount, action string) (map[string]interface{}, error) {
	if action == "" {
		action = wiProbeActionRead
	}
	if action != wiProbeActionRead {
		return nil, fmt.Errorf("workload cloud action %q is not supported (supported: %s)", action, wiProbeActionRead)
	}
	if strings.TrimSpace(serviceAccount) == "" {
		return nil, fmt.Errorf("serviceAccount is required")
	}
	if namespace == "" {
		namespace = configOr(s.config, "test-workload-namespace", "default")
	}
	resource := strings.TrimSpace(s.config.Get("wi-probe-resource"))
	if resource == "" {
		return nil, fmt.Errorf("Kubernetes API prerequisite missing: set wi-probe-resource (bucket / storage account) to the workload identity probe fixture (cluster=%s)", clusterID)
	}
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}

	timeout := configDuration(s.config, "wi-probe-timeout-ms", 120*time.Second)
	job, err := s.buildWIProbeJob(namespace, serviceAccount, resource, timeout)
	if err != nil {
		return nil, err
	}
	result := map[string]interface{}{
		"Succeeded": false, "Denied": false, "Error": "",
		"Namespace": namespace, "ServiceAccount": serviceAccount, "Action": action, "Resource": resource,
	}
	created, err := client.BatchV1().Jobs(namespace).Create(s.ctx, job, metav1.CreateOptions{})
	if err != nil {
		result["Error"] = err.Error()
		return result, fmt.Errorf("create workload identity probe job: %w", err)
	}
	result["Job"] = created.Name
	defer func() {
		prop := metav1.DeletePropagationBackground
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		_ = client.BatchV1().Jobs(namespace).Delete(cleanupCtx, created.Name, metav1.DeleteOptions{PropagationPolicy: &prop})
	}()

	logs, waitErr := s.waitForWIProbe(client, namespace, created.Name, timeout)
	if waitErr != nil {
		result["Error"] = waitErr.Error()
		return result, fmt.Errorf("workload identity probe for %s/%s: %w", namespace, serviceAccount, waitErr)
	}
	outcome, detail := parseWIProbeResult(logs)
	switch outcome {
	case "OK":
		result["Succeeded"] = true
		return result, nil
	case "DENIED":
		result["Denied"] = true
		result["Error"] = detail
		return result, fmt.Errorf("%w: workload %s/%s could not %s %s: %s", ErrCloudAccessDenied, namespace, serviceAccount, action, resource, detail)
	default:
		result["Error"] = detail
		return result, fmt.Errorf("workload identity probe for %s/%s failed (not an access denial): %s", namespace, serviceAccount, detail)
	}
}

// buildWIProbeJob builds the restricted-PSS probe Job. Inputs travel as env vars,
// never interpolated into the script.
func (s *managedService) buildWIProbeJob(namespace, serviceAccount, resource string, timeout time.Duration) (*batchv1.Job, error) {
	script, ok := wiProbeScripts[s.provider]
	if !ok {
		return nil, fmt.Errorf("workload identity probe has no script for provider %q", s.provider)
	}
	image := firstNonEmpty(s.config.Get("wi-probe-image"), wiProbeDefaultImages[s.provider])
	deadline := int64(timeout.Seconds())
	if deadline < 30 {
		deadline = 30
	}
	backoff := int32(0)
	podLabels := map[string]string{"role": "wi-probe", "app": "ccc-wi-probe"}
	if s.provider == "azure" {
		podLabels["azure.workload.identity/use"] = "true"
	}
	env := []corev1.EnvVar{
		{Name: "HOME", Value: "/tmp"},
		{Name: "AZURE_CONFIG_DIR", Value: "/tmp/.azure"},
		{Name: "CCC_WI_RESOURCE", Value: resource},
		{Name: "CCC_WI_OBJECT", Value: configOr(s.config, "wi-probe-object", "probe.txt")},
		{Name: "CCC_WI_CONTAINER", Value: configOr(s.config, "wi-probe-container", "probe")},
		{Name: "CCC_WI_EXPECTED", Value: configOr(s.config, "wi-probe-expected", "ccc-wi-probe-ok")},
	}
	if s.provider == "aws" {
		// Isolate the federation path: node-role credentials via IMDS must not satisfy the probe.
		env = append(env, corev1.EnvVar{Name: "AWS_EC2_METADATA_DISABLED", Value: "true"},
			corev1.EnvVar{Name: "AWS_REGION", Value: s.config.CloudParams().Region},
			corev1.EnvVar{Name: "AWS_DEFAULT_REGION", Value: s.config.CloudParams().Region})
	}
	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{GenerateName: "ccc-wi-probe-", Namespace: namespace, Labels: map[string]string{"app": "ccc-wi-probe"}},
		Spec: batchv1.JobSpec{
			BackoffLimit:          &backoff,
			ActiveDeadlineSeconds: &deadline,
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: podLabels},
				Spec: corev1.PodSpec{
					RestartPolicy:      corev1.RestartPolicyNever,
					ServiceAccountName: serviceAccount,
					SecurityContext: &corev1.PodSecurityContext{
						RunAsNonRoot:   boolPtr(true),
						RunAsUser:      int64Ptr(65534),
						FSGroup:        int64Ptr(65534),
						SeccompProfile: &corev1.SeccompProfile{Type: corev1.SeccompProfileTypeRuntimeDefault},
					},
					Containers: []corev1.Container{{
						Name:            "probe",
						Image:           image,
						ImagePullPolicy: corev1.PullIfNotPresent,
						Command:         []string{"/bin/sh", "-c"},
						Args:            []string{script},
						Env:             env,
						VolumeMounts:    []corev1.VolumeMount{{Name: "tmp", MountPath: "/tmp"}},
						// azure-cli OOMs under the ccc-test LimitRange default (128Mi);
						// pin near the namespace max so federated login can complete.
						Resources: corev1.ResourceRequirements{
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    apiresource.MustParse(wiProbeCPURequest(s.provider)),
								corev1.ResourceMemory: apiresource.MustParse(wiProbeMemoryRequest(s.provider)),
							},
							Limits: corev1.ResourceList{
								corev1.ResourceCPU:    apiresource.MustParse(wiProbeCPULimit(s.provider)),
								corev1.ResourceMemory: apiresource.MustParse(wiProbeMemoryLimit(s.provider)),
							},
						},
						SecurityContext: &corev1.SecurityContext{
							AllowPrivilegeEscalation: boolPtr(false),
							RunAsNonRoot:             boolPtr(true),
							RunAsUser:                int64Ptr(65534),
							Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
							SeccompProfile:           &corev1.SeccompProfile{Type: corev1.SeccompProfileTypeRuntimeDefault},
						},
					}},
					Volumes: []corev1.Volume{{Name: "tmp", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}}},
				},
			},
		},
	}, nil
}

// waitForWIProbe polls until the Job finishes and returns the probe pod's log.
// Timeouts include pod/event diagnostics (image pull errors, admission denials of the pod).
func (s *managedService) waitForWIProbe(client kubernetes.Interface, namespace, jobName string, timeout time.Duration) (string, error) {
	deadline := time.Now().Add(timeout)
	for {
		job, err := client.BatchV1().Jobs(namespace).Get(s.ctx, jobName, metav1.GetOptions{})
		if err != nil {
			return "", fmt.Errorf("get probe job: %w", err)
		}
		if job.Status.Succeeded > 0 || job.Status.Failed > 0 {
			logs, logErr := s.wiProbeLogs(client, namespace, jobName)
			if logErr != nil {
				return "", logErr
			}
			return logs, nil
		}
		if time.Now().After(deadline) {
			return "", fmt.Errorf("probe job timed out after %s: %s", timeout, s.wiProbeDiagnostics(client, namespace, jobName))
		}
		select {
		case <-s.ctx.Done():
			return "", s.ctx.Err()
		case <-time.After(time.Second):
		}
	}
}

func (s *managedService) wiProbeLogs(client kubernetes.Interface, namespace, jobName string) (string, error) {
	pods, err := client.CoreV1().Pods(namespace).List(s.ctx, metav1.ListOptions{LabelSelector: "job-name=" + jobName})
	if err != nil {
		return "", fmt.Errorf("list probe pods: %w", err)
	}
	if len(pods.Items) == 0 {
		return "", fmt.Errorf("probe job %s finished without a pod", jobName)
	}
	raw, err := client.CoreV1().Pods(namespace).GetLogs(pods.Items[0].Name, &corev1.PodLogOptions{Container: "probe"}).DoRaw(s.ctx)
	if err != nil {
		return "", fmt.Errorf("read probe pod logs: %w", err)
	}
	return string(raw), nil
}

func (s *managedService) wiProbeDiagnostics(client kubernetes.Interface, namespace, jobName string) string {
	var notes []string
	if pods, err := client.CoreV1().Pods(namespace).List(s.ctx, metav1.ListOptions{LabelSelector: "job-name=" + jobName}); err == nil {
		for _, pod := range pods.Items {
			notes = append(notes, fmt.Sprintf("pod %s phase=%s", pod.Name, pod.Status.Phase))
			for _, status := range pod.Status.ContainerStatuses {
				if status.State.Waiting != nil {
					notes = append(notes, fmt.Sprintf("waiting=%s %s", status.State.Waiting.Reason, status.State.Waiting.Message))
				}
			}
		}
	}
	if events, err := client.CoreV1().Events(namespace).List(s.ctx, metav1.ListOptions{FieldSelector: "involvedObject.name=" + jobName}); err == nil {
		sort.Slice(events.Items, func(i, j int) bool { return events.Items[i].LastTimestamp.Before(&events.Items[j].LastTimestamp) })
		for _, event := range events.Items {
			if event.Type == corev1.EventTypeWarning {
				notes = append(notes, fmt.Sprintf("%s: %s", event.Reason, event.Message))
			}
		}
	}
	if len(notes) == 0 {
		return "no pod or event evidence"
	}
	return strings.Join(notes, "; ")
}

// parseWIProbeResult reads the last CCC_WI_RESULT= line. Missing output is an
// ERROR (never DENIED) so crashes cannot masquerade as denials.
func parseWIProbeResult(logs string) (outcome, detail string) {
	lines := strings.Split(strings.TrimSpace(logs), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(lines[i])
		if !strings.HasPrefix(line, wiProbeResultPrefix) {
			continue
		}
		rest := strings.TrimPrefix(line, wiProbeResultPrefix)
		outcome, detail, _ = strings.Cut(rest, " ")
		switch outcome {
		case "OK", "DENIED", "ERROR":
			return outcome, strings.TrimSpace(detail)
		}
	}
	tail := strings.TrimSpace(logs)
	if len(tail) > 300 {
		tail = tail[len(tail)-300:]
	}
	return "ERROR", "probe produced no result marker: " + tail
}

// Probe scripts. They print only a result marker and a short (non-secret) reason,
// never object content. Denials are matched narrowly: auth/authz failures and a
// workload that was never given federated credentials.
var wiProbeScripts = map[string]string{
	"aws": `set +e
OUT=$(aws s3api get-object --bucket "$CCC_WI_RESOURCE" --key "$CCC_WI_OBJECT" /tmp/probe.out 2>&1)
RC=$?
if [ $RC -eq 0 ]; then
  if [ "$(cat /tmp/probe.out)" = "$CCC_WI_EXPECTED" ]; then echo "CCC_WI_RESULT=OK"; else echo "CCC_WI_RESULT=ERROR probe object content mismatch"; fi
  exit 0
fi
REASON=$(echo "$OUT" | tail -n 1 | cut -c1-200)
case "$OUT" in
  *AccessDenied*|*"Unable to locate credentials"*|*InvalidIdentityToken*|*"not authorized"*|*Forbidden*|*"(403)"*|*ExpiredToken*) echo "CCC_WI_RESULT=DENIED $REASON";;
  *) echo "CCC_WI_RESULT=ERROR $REASON";;
esac
exit 0
`,
	"azure": `set +e
if [ -z "$AZURE_FEDERATED_TOKEN_FILE" ] || [ -z "$AZURE_CLIENT_ID" ]; then
  echo "CCC_WI_RESULT=DENIED no federated workload identity credentials are projected for this service account"
  exit 0
fi
classify() {
  REASON=$(echo "$1" | tail -n 1 | cut -c1-200)
  case "$1" in
    *AADSTS*|*AuthorizationPermissionMismatch*|*AuthorizationFailure*|*AuthenticationFailed*|*"not authorized"*|*Forbidden*|*"403"*) echo "CCC_WI_RESULT=DENIED $REASON";;
    *) echo "CCC_WI_RESULT=ERROR $REASON";;
  esac
}
OUT=$(az login --service-principal -u "$AZURE_CLIENT_ID" -t "$AZURE_TENANT_ID" --federated-token "$(cat "$AZURE_FEDERATED_TOKEN_FILE")" --allow-no-subscriptions -o none 2>&1)
if [ $? -ne 0 ]; then classify "$OUT"; exit 0; fi
OUT=$(az storage blob download --account-name "$CCC_WI_RESOURCE" --container-name "$CCC_WI_CONTAINER" --name "$CCC_WI_OBJECT" --auth-mode login --file /tmp/probe.out -o none 2>&1)
if [ $? -ne 0 ]; then classify "$OUT"; exit 0; fi
if [ "$(cat /tmp/probe.out)" = "$CCC_WI_EXPECTED" ]; then echo "CCC_WI_RESULT=OK"; else echo "CCC_WI_RESULT=ERROR probe object content mismatch"; fi
exit 0
`,
	"gcp": `set +e
# Prefer the link-local metadata IP (avoids DNS under default-deny egress).
TOKEN_JSON=$(curl -s -m 10 -H "Metadata-Flavor: Google" "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token")
# Compact JSON has no spaces around ":"; keep the pattern space-tolerant.
TOKEN=$(echo "$TOKEN_JSON" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "CCC_WI_RESULT=DENIED workload identity metadata server issued no access token"
  exit 0
fi
OBJECT=$(echo "$CCC_WI_OBJECT" | sed 's#/#%2F#g')
CODE=$(curl -s -m 20 -o /tmp/probe.out -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "https://storage.googleapis.com/storage/v1/b/$CCC_WI_RESOURCE/o/$OBJECT?alt=media")
case "$CODE" in
  200) if [ "$(cat /tmp/probe.out)" = "$CCC_WI_EXPECTED" ]; then echo "CCC_WI_RESULT=OK"; else echo "CCC_WI_RESULT=ERROR probe object content mismatch"; fi;;
  401|403) echo "CCC_WI_RESULT=DENIED storage API returned HTTP $CODE";;
  *) echo "CCC_WI_RESULT=ERROR storage API returned HTTP $CODE";;
esac
exit 0
`,
}
