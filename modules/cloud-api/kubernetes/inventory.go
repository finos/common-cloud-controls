package kubernetes

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// addonEvidence is one CSP-managed add-on/extension observed on the cluster.
type addonEvidence struct {
	Name       string
	Version    string
	Publisher  string
	Status     string
	Compatible bool
	InSupport  bool
	Reason     string
}

// supportEvidence is what a provider contributes to GetClusterComponentInventory.
// Nil / empty members mean the provider could not observe that dimension; the
// inventory then reports the dependent flag as false rather than guessing.
type supportEvidence struct {
	Source string
	// SupportedMinors lists Kubernetes minors ("1.31") inside the CSP support lifecycle.
	SupportedMinors map[string]bool
	// NodeImageInSupport is nil when the provider cannot judge node images.
	NodeImageInSupport *bool
	NodeImageReason    string
	Addons             []addonEvidence
}

// autoscalerBound is one scaling boundary (node pool or HPA).
type autoscalerBound struct {
	Name    string
	Kind    string
	Min     int64
	Max     int64
	Enabled bool
}

func boolRef(v bool) *bool { return &v }

// kubeMinor reduces v1.31.4-eks-abc / 1.31.4-gke.100 / 1.31 to "1.31".
func kubeMinor(version string) string {
	version = strings.TrimPrefix(strings.TrimSpace(version), "v")
	parts := strings.SplitN(version, ".", 3)
	if len(parts) < 2 {
		return ""
	}
	minor := strings.FieldsFunc(parts[1], func(r rune) bool { return r < '0' || r > '9' })
	if len(minor) == 0 {
		return ""
	}
	return parts[0] + "." + minor[0]
}

func minorAtLeast(minor, floor string) bool {
	mMajor, mMinor, ok1 := splitMinor(minor)
	fMajor, fMinor, ok2 := splitMinor(floor)
	if !ok1 || !ok2 {
		return false
	}
	return mMajor > fMajor || (mMajor == fMajor && mMinor >= fMinor)
}

func splitMinor(minor string) (int, int, bool) {
	major, rest, ok := strings.Cut(kubeMinor(minor), ".")
	if !ok {
		return 0, 0, false
	}
	a, err1 := strconv.Atoi(major)
	b, err2 := strconv.Atoi(rest)
	return a, b, err1 == nil && err2 == nil
}

// versionInSupport requires at least one evidence source (CSP list or the
// min-supported-version floor) and every available source to agree.
func versionInSupport(minor, floor string, evidence *supportEvidence) bool {
	if minor == "" {
		return false
	}
	known := false
	if floor != "" {
		known = true
		if !minorAtLeast(minor, floor) {
			return false
		}
	}
	if evidence != nil && evidence.SupportedMinors != nil {
		known = true
		if !evidence.SupportedMinors[minor] {
			return false
		}
	}
	return known
}

// buildComponentInventory assembles the CN09 inventory from the control-plane
// version, worker list and provider support evidence. evidenceErr is surfaced
// verbatim so a failed CSP lookup is visible rather than silently "unsupported".
func buildComponentInventory(cfg types.Config, controlPlaneVersion string, workers []map[string]interface{}, evidence *supportEvidence, evidenceErr error) map[string]interface{} {
	floor := kubeMinor(cfg.Get("min-supported-version"))
	cpMinor := kubeMinor(controlPlaneVersion)
	controlPlaneOK := versionInSupport(cpMinor, floor, evidence)

	workersOK := len(workers) > 0
	unsupportedWorkers := []map[string]interface{}{}
	for _, worker := range workers {
		version, _ := worker["Version"].(string)
		if !versionInSupport(kubeMinor(version), floor, evidence) {
			workersOK = false
			unsupportedWorkers = append(unsupportedWorkers, worker)
		}
	}

	nodeImageOK, nodeImageReason := false, "provider node image support evidence is unavailable"
	if evidence != nil && evidence.NodeImageInSupport != nil {
		nodeImageOK, nodeImageReason = *evidence.NodeImageInSupport, evidence.NodeImageReason
	}

	addons := []map[string]interface{}{}
	incompatible := []map[string]interface{}{}
	unsupportedAddons := []map[string]interface{}{}
	if evidence != nil {
		for _, addon := range evidence.Addons {
			entry := map[string]interface{}{
				"Name": addon.Name, "Version": addon.Version, "Publisher": addon.Publisher, "Status": addon.Status,
				"Compatible": addon.Compatible, "CompatibleWithControlPlane": addon.Compatible,
				"InSupport": addon.InSupport, "PublisherSupported": addon.InSupport, "Reason": addon.Reason,
			}
			addons = append(addons, entry)
			if !addon.Compatible {
				incompatible = append(incompatible, entry)
			}
			if !addon.InSupport {
				unsupportedAddons = append(unsupportedAddons, entry)
			}
		}
	}

	result := map[string]interface{}{
		"ControlPlaneVersion": controlPlaneVersion, "ControlPlaneMinor": cpMinor,
		"Workers": workers, "Addons": addons,
		"ControlPlaneInSupport": controlPlaneOK, "WorkersInSupport": workersOK, "NodeImageInSupport": nodeImageOK,
		"NodeImageReason":    nodeImageReason,
		"UnsupportedWorkers": unsupportedWorkers,
		"IncompatibleAddons": incompatible, "UnsupportedAddons": unsupportedAddons,
		"MinSupportedVersion": floor,
	}
	if evidence != nil {
		result["SupportEvidenceSource"] = evidence.Source
	}
	if evidenceErr != nil {
		result["SupportEvidenceError"] = evidenceErr.Error()
	}
	return result
}

func (s *managedService) GetClusterComponentInventory(clusterID string) (map[string]interface{}, error) {
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	version, err := client.Discovery().ServerVersion()
	if err != nil {
		return nil, err
	}
	nodes, err := client.CoreV1().Nodes().List(s.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	workers := make([]map[string]interface{}, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		workers = append(workers, map[string]interface{}{"Name": node.Name, "Version": node.Status.NodeInfo.KubeletVersion, "Image": node.Status.NodeInfo.OSImage})
	}
	var (
		evidence    *supportEvidence
		evidenceErr error
	)
	if s.support != nil {
		evidence, evidenceErr = s.support(s.ctx, clusterID)
	}
	return buildComponentInventory(s.config, version.GitVersion, workers, evidence, evidenceErr), nil
}

// summarizeNodeIntegrity derives the CN18 summary arrays from per-node evidence.
func summarizeNodeIntegrity(nodes []map[string]interface{}) map[string]interface{} {
	unsupported := []map[string]interface{}{}
	untrusted := []map[string]interface{}{}
	disabled := []map[string]interface{}{}
	for _, node := range nodes {
		if ok, _ := node["ImageSupported"].(bool); !ok {
			unsupported = append(unsupported, node)
		}
		if source, _ := node["ImageSource"].(string); source != "csp" && source != "marketplace" {
			untrusted = append(untrusted, node)
		}
		if ok, _ := node["BootIntegrityEnabled"].(bool); !ok {
			disabled = append(disabled, node)
		}
	}
	if nodes == nil {
		nodes = []map[string]interface{}{}
	}
	return map[string]interface{}{
		"Nodes": nodes, "UnsupportedImages": unsupported,
		"UntrustedImageSources": untrusted, "BootIntegrityDisabledNodes": disabled,
	}
}

func (s *managedService) GetNodeIntegrityStatus(clusterID string) (map[string]interface{}, error) {
	if s.nodeIntegrity != nil {
		nodes, err := s.nodeIntegrity(s.ctx, clusterID)
		if err != nil {
			return nil, err
		}
		return summarizeNodeIntegrity(nodes), nil
	}
	client, _, err := s.kubeClients()
	if err != nil {
		return nil, err
	}
	list, err := client.CoreV1().Nodes().List(s.ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	nodes := []map[string]interface{}{}
	for _, node := range list.Items {
		nodes = append(nodes, map[string]interface{}{
			"Name": node.Name, "ImageID": node.Status.NodeInfo.OSImage, "ImageSource": "unknown",
			"ImageSupported": false, "BootIntegrityEnabled": false,
			"Reason": "Kubernetes Node status does not expose image publisher support or measured-boot state; provider corroboration is required",
		})
	}
	return summarizeNodeIntegrity(nodes), nil
}

// nodeAutoscalers returns CSP node-pool scaling bounds, if the provider exposes them.
func (s *managedService) nodeAutoscalers(ctx context.Context) ([]autoscalerBound, error) {
	if s.autoscalers == nil {
		return nil, fmt.Errorf("provider node-pool autoscaler API is unavailable")
	}
	return s.autoscalers(ctx, "")
}
