package vpc

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/smithy-go"
)

func (s *AWSVPCService) EvaluatePeerAgainstAllowList(peerVpcID string) (map[string]interface{}, error) {
	peerVpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", peerVpcID))
	if peerVpcIDStr == "" {
		return nil, fmt.Errorf("peerVpcID is required")
	}

	entries, err := s.resolveCN03AllowedVpcEntriesWithOrigin()
	if err != nil {
		return nil, err
	}

	allowed := false
	for _, e := range entries {
		if e.VpcID == peerVpcIDStr {
			allowed = true
			break
		}
	}

	reason := "CN03 allow-list is not defined; classification is non-enforcing until IAM/SCP guardrail is configured"
	if len(entries) > 0 {
		if allowed {
			reason = "requester VPC exists in CN03 allow-list; expected enforcement outcome is allow"
		} else {
			reason = "requester VPC does not exist in CN03 allow-list; expected enforcement outcome is deny"
		}
	}

	return map[string]interface{}{
		"PeerVpcId":          peerVpcIDStr,
		"Allowed":            allowed,
		"AllowedListDefined": len(entries) > 0,
		"Reason":             reason,
	}, nil
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
		return s.enrichCN03EnforcementEvidence(requesterVpcIDStr, evidence), nil
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
		return s.enrichCN03EnforcementEvidence(requesterVpcIDStr, evidence), nil
	}

	if strings.Contains(strings.ToLower(errText), "dryrunoperation") {
		evidence["DryRunAllowed"] = true
		evidence["ExitCode"] = 0
		evidence["ErrorCode"] = "DryRunOperation"
		evidence["Reason"] = "dry-run response indicates request would be allowed"
	}

	return s.enrichCN03EnforcementEvidence(requesterVpcIDStr, evidence), nil
}

func (s *AWSVPCService) enrichCN03EnforcementEvidence(requesterVpcID string, evidence map[string]interface{}) map[string]interface{} {
	entries, err := s.resolveCN03AllowedVpcEntriesWithOrigin()
	if err != nil {
		evidence["AllowListDefined"] = false
		evidence["RequesterInAllowList"] = false
		evidence["GuardrailExpectation"] = ""
		evidence["GuardrailMismatch"] = false
		evidence["Reason"] = fmt.Sprintf("%v; CN03 allow-list resolution failed: %v", evidence["Reason"], err)
		return evidence
	}

	allowListDefined := len(entries) > 0
	requesterInAllowList := false
	for _, e := range entries {
		if e.VpcID == requesterVpcID {
			requesterInAllowList = true
			break
		}
	}

	evidence["AllowListDefined"] = allowListDefined
	evidence["RequesterInAllowList"] = requesterInAllowList
	evidence["ConflictType"] = ""
	evidence["ConflictMessage"] = ""

	if !allowListDefined {
		evidence["GuardrailExpectation"] = ""
		evidence["GuardrailMismatch"] = false
		evidence["Reason"] = fmt.Sprintf("%v; CN03 allow-list is not defined, so enforcement expectation cannot be computed", evidence["Reason"])
		return evidence
	}

	expectedAllowed := requesterInAllowList
	guardrailExpectation := "deny"
	if expectedAllowed {
		guardrailExpectation = "allow"
	}

	actualAllowed := boolFromEvidence(evidence["DryRunAllowed"])
	// Denied dry-run must report non-zero exit code for feature assertions.
	if !actualAllowed {
		evidence["ExitCode"] = 1
	}
	guardrailMismatch := actualAllowed != expectedAllowed

	evidence["GuardrailExpectation"] = guardrailExpectation
	evidence["GuardrailMismatch"] = guardrailMismatch
	if guardrailMismatch {
		if requesterInAllowList && !actualAllowed {
			evidence["ConflictType"] = "ALLOWLIST_CONFLICT"
			evidence["ConflictMessage"] = "allowlisted requester denied by guardrail policy"
		} else if !requesterInAllowList && actualAllowed {
			evidence["ConflictType"] = "DENYLIST_CONFLICT"
			evidence["ConflictMessage"] = "non-allowlisted requester permitted by guardrail policy"
		} else {
			evidence["ConflictType"] = "GUARDRAIL_CONFLICT"
			evidence["ConflictMessage"] = "guardrail decision does not match allow-list expectation"
		}
		evidence["Reason"] = fmt.Sprintf("%v; CN03 guardrail mismatch: allow-list expects %s for requester %s", evidence["Reason"], guardrailExpectation, requesterVpcID)
	} else {
		evidence["Reason"] = fmt.Sprintf("%v; CN03 guardrail aligned: allow-list expects %s for requester %s", evidence["Reason"], guardrailExpectation, requesterVpcID)
	}

	return evidence
}

func cn03String(value interface{}) string {
	if value == nil {
		return ""
	}
	out := strings.TrimSpace(fmt.Sprintf("%v", value))
	if out == "<nil>" {
		return ""
	}
	return out
}

func cn03StringSlice(value interface{}) []string {
	switch typedValue := value.(type) {
	case nil:
		return []string{}
	case string:
		return normalizeStringList([]string{typedValue})
	case []string:
		return normalizeStringList(typedValue)
	case []interface{}:
		items := make([]string, 0, len(typedValue))
		for _, item := range typedValue {
			items = append(items, cn03String(item))
		}
		return normalizeStringList(items)
	default:
		return normalizeStringList([]string{fmt.Sprintf("%v", typedValue)})
	}
}

func normalizeStringList(values []string) []string {
	normalized := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))

	for _, rawValue := range values {
		for _, item := range strings.Split(rawValue, ",") {
			trimmed := strings.TrimSpace(item)
			if trimmed == "" {
				continue
			}
			if _, exists := seen[trimmed]; exists {
				continue
			}
			seen[trimmed] = struct{}{}
			normalized = append(normalized, trimmed)
		}
	}

	return normalized
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" && trimmed != "<nil>" {
			return trimmed
		}
	}
	return ""
}

// cn03AllowedVpcEntry pairs a VPC ID with the source that defined it.
// Origin values: "terraform-fixture" | "env-guardrail" | "yaml-guardrail"
type cn03AllowedVpcEntry struct {
	VpcID  string
	Origin string
}

// resolveCN03AllowedVpcEntriesWithOrigin resolves the full CN03 allow-list
// and tags each entry with the source that introduced it.
// First-seen wins on deduplication — terraform-fixture sources are resolved
// first so they take precedence over looser env or yaml definitions.
func (s *AWSVPCService) resolveCN03AllowedVpcEntriesWithOrigin() ([]cn03AllowedVpcEntry, error) {
	return s.resolveCN03VpcEntriesWithOrigin("allowed-requester-vpc-ids")
}

// resolveCN03DisallowedVpcEntriesWithOrigin resolves the full CN03 disallow-list
// and tags each entry with the source that introduced it.
func (s *AWSVPCService) resolveCN03DisallowedVpcEntriesWithOrigin() ([]cn03AllowedVpcEntry, error) {
	return s.resolveCN03VpcEntriesWithOrigin("disallowed-requester-vpc-ids")
}

// resolveCN03VpcEntriesWithOrigin reads allow/disallow lists from Privateer vpc vars.
func (s *AWSVPCService) resolveCN03VpcEntriesWithOrigin(yamlKey string) ([]cn03AllowedVpcEntry, error) {
	seen := make(map[string]struct{})
	entries := make([]cn03AllowedVpcEntry, 0)

	add := func(ids []string, origin string) {
		for _, id := range normalizeStringList(ids) {
			if _, exists := seen[id]; !exists {
				seen[id] = struct{}{}
				entries = append(entries, cn03AllowedVpcEntry{VpcID: id, Origin: origin})
			}
		}
	}

	vpcCfg := s.config.VpcServiceConfig()
	switch yamlKey {
	case "allowed-requester-vpc-ids":
		add(vpcCfg.AllowedRequesterVpcIds, "yaml-guardrail")
		add(cn03StringSlice(vpcCfg.AllowedRequesterVpcIdsCsv), "yaml-guardrail")
	case "disallowed-requester-vpc-ids":
		add(vpcCfg.DisallowedRequesterVpcIds, "yaml-guardrail")
		add(cn03StringSlice(vpcCfg.DisallowedRequesterVpcIdsCsv), "yaml-guardrail")
	}

	return entries, nil
}

// ValidateDisallowListEnforcement dry-runs every VPC in the CN03 disallow-list
// against receiverVpcID and returns an aggregate enforcement result with per-VPC
// origin info. A guardrail mismatch (disallowed VPC was permitted) counts as a
// violation. Attach "{result.Results}" to see the full per-VPC breakdown.
func (s *AWSVPCService) ValidateDisallowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, false)
}

// ValidateAllowListEnforcement dry-runs every VPC in the CN03 allow-list
// against receiverVpcID and returns an aggregate enforcement result with per-VPC
// origin info. A guardrail mismatch (allowed VPC was denied) counts as a
// violation. Attach "{result.Results}" to see the full per-VPC breakdown.
func (s *AWSVPCService) ValidateAllowListEnforcement(receiverVpcID string) (map[string]interface{}, error) {
	return s.validateEnforcementBatch(receiverVpcID, true)
}

// validateEnforcementBatch is the shared implementation for both enforcement
// validators. When expectAllowed is false, entries come from the disallow-list
// and the passing condition is DryRunAllowed=false. When expectAllowed is true,
// entries come from the allow-list and the passing condition is DryRunAllowed=true.
func (s *AWSVPCService) validateEnforcementBatch(receiverVpcID string, expectAllowed bool) (map[string]interface{}, error) {
	receiverVpcIDStr, err := s.resolveVpcID(receiverVpcID)
	if err != nil {
		return nil, err
	}

	var entries []cn03AllowedVpcEntry
	var listErr error
	var listType string
	if expectAllowed {
		entries, listErr = s.resolveCN03AllowedVpcEntriesWithOrigin()
		listType = "allow-list"
	} else {
		entries, listErr = s.resolveCN03DisallowedVpcEntriesWithOrigin()
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

func cn03PeerOwnerID() string {
	for _, key := range []string{"CN03_PEER_OWNER_ID", "PEER_OWNER_ID"} {
		value := strings.TrimSpace(os.Getenv(key))
		if value != "" {
			return value
		}
	}
	return ""
}
