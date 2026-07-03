package vpc

import (
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/smithy-go"
)

func (s *AWSVPCService) EvaluatePeerAgainstAllowList(peerVpcID string) (map[string]interface{}, error) {
	return cn03EvaluatePeerAgainstAllowList(s.config, peerVpcID)
}

func (s *AWSVPCService) AttemptVpcPeeringDryRun(requesterVpcID, peerVpcID string) (map[string]interface{}, error) {
	requester, err := s.resolveVpcID(requesterVpcID)
	if err != nil {
		return nil, err
	}
	peer, err := s.resolveVpcID(peerVpcID)
	if err != nil {
		return nil, err
	}
	return s.attemptVpcPeeringDryRunWithOwner(requester, peer, cn03PeerOwnerID())
}

func (s *AWSVPCService) attemptVpcPeeringDryRunWithOwner(requesterVpcID, peerVpcID, peerOwnerID string) (map[string]interface{}, error) {
	requesterVpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", requesterVpcID))
	peerVpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", peerVpcID))
	peerOwnerIDStr := strings.TrimSpace(fmt.Sprintf("%v", peerOwnerID))

	if requesterVpcIDStr == "" {
		return nil, fmt.Errorf("requesterVpcID is required")
	}
	if peerVpcIDStr == "" {
		return nil, fmt.Errorf("peerVpcID is required")
	}

	input := &ec2.CreateVpcPeeringConnectionInput{
		VpcId:     aws.String(requesterVpcIDStr),
		PeerVpcId: aws.String(peerVpcIDStr),
		DryRun:    aws.Bool(true),
	}
	if peerOwnerIDStr != "" {
		input.PeerOwnerId = aws.String(peerOwnerIDStr)
	}

	evidence := map[string]interface{}{
		"RequesterVpcId": requesterVpcIDStr,
		"PeerVpcId":      peerVpcIDStr,
		"ReceiverVpcId":  peerVpcIDStr,
		"PeerOwnerId":    peerOwnerIDStr,
		"DryRunAllowed":  false,
		"ExitCode":       1,
		"ErrorCode":      "",
		"Stderr":         "",
		"Reason":         "request denied",
	}

	_, err := s.client.CreateVpcPeeringConnection(s.ctx, input)
	if err == nil {
		evidence["DryRunAllowed"] = true
		evidence["ExitCode"] = 0
		evidence["Reason"] = "dry-run call returned success; request would be allowed"
		return CN03EnrichEvidence(s.config, requesterVpcIDStr, evidence), nil
	}

	errText := strings.TrimSpace(err.Error())
	evidence["Stderr"] = errText
	evidence["Reason"] = errText

	var apiErr smithy.APIError
	if errors.As(err, &apiErr) {
		errorCode := strings.TrimSpace(apiErr.ErrorCode())
		evidence["ErrorCode"] = errorCode

		if strings.EqualFold(errorCode, "DryRunOperation") {
			evidence["DryRunAllowed"] = true
			evidence["ExitCode"] = 0
			evidence["Reason"] = "DryRunOperation indicates request would be allowed"
		}
		return CN03EnrichEvidence(s.config, requesterVpcIDStr, evidence), nil
	}

	if strings.Contains(strings.ToLower(errText), "dryrunoperation") {
		evidence["DryRunAllowed"] = true
		evidence["ExitCode"] = 0
		evidence["ErrorCode"] = "DryRunOperation"
		evidence["Reason"] = "dry-run response indicates request would be allowed"
	}

	return CN03EnrichEvidence(s.config, requesterVpcIDStr, evidence), nil
}

func (s *AWSVPCService) ValidateDisallowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, false)
}

func (s *AWSVPCService) ValidateAllowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, true)
}

func (s *AWSVPCService) validateEnforcementBatch(receiverVpcID string, expectAllowed bool) (map[string]interface{}, error) {
	receiverVpcIDStr, err := s.resolveVpcID(receiverVpcID)
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
	peerOwnerID := cn03PeerOwnerID()

	for _, entry := range entries {
		requesterID, resolveErr := s.resolveVpcID(entry.VpcID)
		if resolveErr != nil {
			return nil, resolveErr
		}
		evidence, dryRunErr := s.attemptVpcPeeringDryRunWithOwner(requesterID, receiverVpcIDStr, peerOwnerID)
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
		summary = fmt.Sprintf("no %s entries found; configure terraform fixtures or env vars", listType)
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
		"ReceiverVpcId":  receiverVpcIDStr,
		"ListType":       listType,
		"Summary":        summary,
		"Results":        results,
	}, nil
}
