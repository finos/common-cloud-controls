package vpc

import "fmt"

// Azure has no EC2-style VPC peering dry-run. CN03 integration tests use configured
// allow/disallow lists plus VNet existence checks (same approach as GCP).

func (s *AzureVPCService) EvaluatePeerAgainstAllowList(peerVpcID string) (map[string]interface{}, error) {
	return cn03EvaluatePeerAgainstAllowList(s.config, peerVpcID)
}

func (s *AzureVPCService) AttemptVpcPeeringDryRun(requesterVpcID, peerVpcID string) (map[string]interface{}, error) {
	requester, err := s.resolveVNetName(requesterVpcID)
	if err != nil {
		return nil, err
	}
	peer, err := s.resolveVNetName(peerVpcID)
	if err != nil {
		return nil, err
	}
	return s.attemptVpcPeeringDryRun(requester, peer)
}

func (s *AzureVPCService) attemptVpcPeeringDryRun(requesterVNet, peerVNet string) (map[string]interface{}, error) {
	if err := s.ensureVNetExists(requesterVNet); err != nil {
		return nil, err
	}
	if err := s.ensureVNetExists(peerVNet); err != nil {
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

	requesterInAllowList := cn03ListContainsNetwork(allowedEntries, requesterVNet)
	requesterInDisallowList := cn03ListContainsNetwork(disallowedEntries, requesterVNet)

	dryRunAllowed := requesterInAllowList && !requesterInDisallowList
	reason := "Azure CN03 simulated guardrail: requester not in allow-list or listed on disallow-list"
	if dryRunAllowed {
		reason = "Azure CN03 simulated guardrail: requester permitted by allow/disallow lists"
	}

	evidence := map[string]interface{}{
		"RequesterVpcId": requesterVNet,
		"PeerVpcId":      peerVNet,
		"ReceiverVpcId":  peerVNet,
		"PeerOwnerId":    s.config.CloudParams().AzureSubscriptionID,
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

	return CN03EnrichEvidence(s.config, requesterVNet, evidence), nil
}

func (s *AzureVPCService) ValidateDisallowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, false)
}

func (s *AzureVPCService) ValidateAllowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, true)
}

func (s *AzureVPCService) validateEnforcementBatch(receiverVpcID string, expectAllowed bool) (map[string]interface{}, error) {
	receiverVNet, err := s.resolveVNetName(receiverVpcID)
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
		requester, resolveErr := s.resolveVNetName(entry.VpcID)
		if resolveErr != nil {
			return nil, resolveErr
		}
		evidence, dryRunErr := s.attemptVpcPeeringDryRun(requester, receiverVNet)
		if dryRunErr != nil {
			return nil, dryRunErr
		}
		evidence["Origin"] = entry.Origin

		if boolFromEvidence(evidence["GuardrailMismatch"]) {
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
		"ReceiverVpcId":  receiverVNet,
		"ListType":       listType,
		"Summary":        summary,
		"Results":        results,
	}, nil
}
