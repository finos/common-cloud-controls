package kubernetes

import (
	"context"
	"fmt"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

const clusterUsableTimeout = 10 * time.Minute

var optionalReadyDeployments = []struct {
	namespace string
	name      string
}{
	{namespace: "kube-system", name: "ebs-csi-controller"},
}

var policyAddonNamespaces = []string{"kube-system", "gatekeeper-system"}

func (s *managedService) waitForClusterUsable() error {
	client, _, err := s.kubeClients()
	if err != nil {
		return err
	}
	return waitForClusterUsable(s.ctx, client, clusterUsableTimeout)
}

func waitForClusterUsable(ctx context.Context, client kubernetes.Interface, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var last error
	for {
		last = clusterUsableError(ctx, client)
		if last == nil {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for cluster to become usable: %w", last)
		}
		select {
		case <-ctx.Done():
			if ctx.Err() != nil {
				return ctx.Err()
			}
			return last
		case <-time.After(5 * time.Second):
		}
	}
}

func clusterUsableError(ctx context.Context, client kubernetes.Interface) error {
	if _, err := client.Discovery().ServerVersion(); err != nil {
		return fmt.Errorf("kubernetes API not ready: %w", err)
	}
	nodes, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("list nodes: %w", err)
	}
	if !hasSchedulableReadyNode(nodes.Items) {
		return fmt.Errorf("no Ready schedulable node")
	}
	if err := optionalDNSReady(ctx, client); err != nil {
		return err
	}
	for _, ref := range optionalReadyDeployments {
		if err := optionalDeploymentReady(ctx, client, ref.namespace, ref.name); err != nil {
			return err
		}
	}
	return optionalPolicyAddonsReady(ctx, client)
}

func hasSchedulableReadyNode(nodes []corev1.Node) bool {
	for _, node := range nodes {
		if node.Spec.Unschedulable {
			continue
		}
		if nodeReady(node) {
			return true
		}
	}
	return false
}

func nodeReady(node corev1.Node) bool {
	for _, cond := range node.Status.Conditions {
		if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

func optionalDNSReady(ctx context.Context, client kubernetes.Interface) error {
	coredns, corednsErr := client.AppsV1().Deployments("kube-system").Get(ctx, "coredns", metav1.GetOptions{})
	kubeDNS, kubeDNSErr := client.AppsV1().Deployments("kube-system").Get(ctx, "kube-dns", metav1.GetOptions{})
	if apierrors.IsNotFound(corednsErr) && apierrors.IsNotFound(kubeDNSErr) {
		return nil
	}
	if corednsErr != nil && !apierrors.IsNotFound(corednsErr) {
		return fmt.Errorf("get kube-system/coredns: %w", corednsErr)
	}
	if kubeDNSErr != nil && !apierrors.IsNotFound(kubeDNSErr) {
		return fmt.Errorf("get kube-system/kube-dns: %w", kubeDNSErr)
	}
	if deploymentReady(coredns) || deploymentReady(kubeDNS) {
		return nil
	}
	return fmt.Errorf("kube-system DNS (coredns/kube-dns) is not Ready")
}

func optionalDeploymentReady(ctx context.Context, client kubernetes.Interface, namespace, name string) error {
	current, err := client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("get %s/%s: %w", namespace, name, err)
	}
	if !deploymentReady(current) {
		return fmt.Errorf("%s/%s is not Ready", namespace, name)
	}
	return nil
}

func optionalPolicyAddonsReady(ctx context.Context, client kubernetes.Interface) error {
	for _, namespace := range policyAddonNamespaces {
		list, err := client.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
		if apierrors.IsNotFound(err) {
			continue
		}
		if err != nil {
			return fmt.Errorf("list deployments in %s: %w", namespace, err)
		}
		for i := range list.Items {
			current := &list.Items[i]
			if !isPolicyAddonName(current.Name) {
				continue
			}
			if !deploymentReady(current) {
				return fmt.Errorf("%s/%s is not Ready", namespace, current.Name)
			}
		}
	}
	return nil
}

func deploymentReady(current *appsv1.Deployment) bool {
	return current != nil && current.Status.ReadyReplicas >= 1
}

func isPolicyAddonName(name string) bool {
	n := strings.ToLower(name)
	return strings.Contains(n, "azure-policy") || strings.Contains(n, "gatekeeper")
}
