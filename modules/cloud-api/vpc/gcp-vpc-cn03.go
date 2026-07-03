package vpc

import (
	"fmt"
	"strings"
)

// GCP does not expose an EC2-style VPC peering dry-run. Integration tests use
// configured CN03 allow/disallow lists (same as Privateer yaml guardrails) and
// verify both networks exist via the Compute API.

func (s *GCPVPCService) EvaluatePeerAgainstAllowList(peerVpcID string) (map[string]interface{}, error) {
	return cn03EvaluatePeerAgainstAllowList(s.config, peerVpcID)
}

func (s *GCPVPCService) AttemptVpcPeeringDryRun(requesterVpcID, peerVpcID string) (map[string]interface{}, error) {
	requester, err := s.resolveNetworkName(requesterVpcID)
	if err != nil {
		return nil, err
	}
	peer, err := s.resolveNetworkName(peerVpcID)
	if err != nil {
		return nil, err
	}
	return s.attemptVpcPeeringDryRun(requester, peer)
}

func (s *GCPVPCService) attemptVpcPeeringDryRun(requesterNetwork, peerNetwork string) (map[string]interface{}, error) {
	if err := s.ensureNetworkExists(requesterNetwork); err != nil {
		return nil, err
	}
	if err := s.ensureNetworkExists(peerNetwork); err != nil {
		return nil, err
	}

	allowedEntries, err := cn03ResolveAllowedEntries(s.config)
	if err != nil {
		return nil, err
	}
	disallowedEntries, err := cn03ResolveDisallowedEntries(s.config)
	if err != nil {
		return nil, err
	}

	requesterInAllowList := cn03ListContainsNetwork(allowedEntries, requesterNetwork)
	requesterInDisallowList := cn03ListContainsNetwork(disallowedEntries, requesterNetwork)

	dryRunAllowed := requesterInAllowList && !requesterInDisallowList
	reason := "GCP CN03 simulated guardrail: requester not in allow-list or listed on disallow-list"
	if dryRunAllowed {
		reason = "GCP CN03 simulated guardrail: requester permitted by allow/disallow lists"
	}

	evidence := map[string]interface{}{
		"RequesterVpcId": requesterNetwork,
		"PeerVpcId":      peerNetwork,
		"ReceiverVpcId":  peerNetwork,
		"PeerOwnerId":    s.projectID,
		"DryRunAllowed":  dryRunAllowed,
		"ExitCode":       0,
		"ErrorCode":      "",
		"Stderr":         "",
		"Reason":         reason,
		"Simulation":     true,
	}
	if !dryRunAllowed {
		evidence["ExitCode"] = 1
	}

	return CN03EnrichEvidence(s.config, requesterNetwork, evidence), nil
}

func cn03ListContainsNetwork(entries []CN03VpcEntry, networkName string) bool {
	for _, entry := range entries {
		if strings.TrimSpace(entry.VpcID) == strings.TrimSpace(networkName) {
			return true
		}
	}
	return false
}

func (s *GCPVPCService) ValidateDisallowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, false)
}

func (s *GCPVPCService) ValidateAllowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, true)
}

func (s *GCPVPCService) validateEnforcementBatch(receiverVpcID string, expectAllowed bool) (map[string]interface{}, error) {
	receiverNetwork, err := s.resolveNetworkName(receiverVpcID)
	if err != nil {
		return nil, err
	}

	var entries []CN03VpcEntry
	var listErr error
	var listType string
	if expectAllowed {
		entries, listErr = cn03ResolveAllowedEntries(s.config)
		listType = "allow-list"
	} else {
		entries, listErr = cn03ResolveDisallowedEntries(s.config)
		listType = "disallow-list"
	}
	if listErr != nil {
		return nil, listErr
	}

	results := make([]interface{}, 0, len(entries))
	violations := make([]string, 0)

	for _, entry := range entries {
		requester, resolveErr := s.resolveNetworkName(entry.VpcID)
		if resolveErr != nil {
			return nil, resolveErr
		}
		evidence, dryRunErr := s.attemptVpcPeeringDryRun(requester, receiverNetwork)
		if dryRunErr != nil {
			return nil, dryRunErr
		}
		evidence["Origin"] = entry.Origin

		mismatch := boolFromEvidence(evidence["GuardrailMismatch"])
		if mismatch {
			violations = append(violations, entry.VpcID)
		}
		results = append(results, evidence)
	}

	testedCount := len(entries)
	allCorrect := len(violations) == 0

	var summary string
	if testedCount == 0 {
		summary = fmt.Sprintf("no %s entries found; configure terraform fixtures or privateer yaml", listType)
	} else if allCorrect {
		if expectAllowed {
			summary = fmt.Sprintf("all %d %s VPC(s) correctly permitted by guardrail", testedCount, listType)
		} else {
			summary = fmt.Sprintf("all %d %s VPC(s) correctly denied by guardrail", testedCount, listType)
		}
	} else {
		summary = fmt.Sprintf("%d of %d %s VPC(s) had guardrail mismatch", len(violations), testedCount, listType)
	}

	return map[string]interface{}{
		"TestedCount":    testedCount,
		"ListDefined":    testedCount > 0,
		"AllCorrect":     allCorrect,
		"ViolationCount": len(violations),
		"ViolatingIds":   violations,
		"ReceiverVpcId":  receiverNetwork,
		"ListType":       listType,
		"Summary":        summary,
		"Results":        results,
	}, nil
}
