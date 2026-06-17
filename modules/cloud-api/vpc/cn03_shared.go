package vpc

import (
	"fmt"
	"os"
	"strings"

	ccctypes "github.com/finos/common-cloud-controls/cloud-api/types"
)

// CN03VpcEntry pairs a VPC/network id with the source that defined it.
// Origin values: "terraform-fixture" | "env-guardrail" | "yaml-guardrail"
type CN03VpcEntry struct {
	VpcID  string
	Origin string
}

func cn03ResolveVpcEntries(cfg ccctypes.Config, yamlKey string) ([]CN03VpcEntry, error) {
	seen := make(map[string]struct{})
	entries := make([]CN03VpcEntry, 0)

	add := func(ids []string, origin string) {
		for _, id := range normalizeStringList(ids) {
			if _, exists := seen[id]; !exists {
				seen[id] = struct{}{}
				entries = append(entries, CN03VpcEntry{VpcID: id, Origin: origin})
			}
		}
	}

	vpcCfg := cfg.VpcServiceConfig()
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

func cn03ResolveAllowedEntries(cfg ccctypes.Config) ([]CN03VpcEntry, error) {
	return cn03ResolveVpcEntries(cfg, "allowed-requester-vpc-ids")
}

func cn03ResolveDisallowedEntries(cfg ccctypes.Config) ([]CN03VpcEntry, error) {
	return cn03ResolveVpcEntries(cfg, "disallowed-requester-vpc-ids")
}

func cn03EvaluatePeerAgainstAllowList(cfg ccctypes.Config, peerVpcID string) (map[string]interface{}, error) {
	peerVpcIDStr := strings.TrimSpace(fmt.Sprintf("%v", peerVpcID))
	if peerVpcIDStr == "" {
		return nil, fmt.Errorf("peerVpcID is required")
	}

	entries, err := cn03ResolveAllowedEntries(cfg)
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

// CN03EnrichEvidence adds allow-list expectation fields to peering dry-run evidence.
func CN03EnrichEvidence(cfg ccctypes.Config, requesterVpcID string, evidence map[string]interface{}) map[string]interface{} {
	entries, err := cn03ResolveAllowedEntries(cfg)
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

func cn03PeerOwnerID() string {
	for _, key := range []string{"CN03_PEER_OWNER_ID", "PEER_OWNER_ID"} {
		value := strings.TrimSpace(os.Getenv(key))
		if value != "" {
			return value
		}
	}
	return ""
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

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" && trimmed != "<nil>" {
			return trimmed
		}
	}
	return ""
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
