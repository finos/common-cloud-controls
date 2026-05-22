package runner

import (
	"fmt"
	"log"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/iam"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// tagFilterSkipsTestIdentities is true when the tag filter targets only ObjStor CN05
// versioning scenarios (no testUser* or ProvisionUserWithAccess steps).
func tagFilterSkipsTestIdentities(tags []string) bool {
	if len(tags) == 0 {
		return false
	}
	joined := strings.ToLower(strings.Join(tags, " "))
	if !strings.Contains(joined, "cn05") {
		return false
	}
	if strings.Contains(joined, "cn01") || strings.Contains(joined, "cn02") ||
		strings.Contains(joined, "cn03") || strings.Contains(joined, "cn04") ||
		strings.Contains(joined, "core.cn05") {
		return false
	}
	return strings.Contains(joined, "objstor.cn05") || strings.Contains(joined, "ccc.objstor.cn05")
}

// loadTestIdentities copies pre-provisioned identities from the object-storage service
// block in environment YAML (test-identities map). Does not create cloud IAM users.
func loadTestIdentities(instance types.InstanceConfig, props map[string]interface{}) {
	svcProps := instance.ServiceProperties("object-storage")
	if svcProps == nil {
		return
	}
	raw, ok := svcProps["test-identities"]
	if !ok || raw == nil {
		return
	}
	identities, ok := raw.(map[string]interface{})
	if !ok {
		log.Printf("   ⚠️  test-identities in environment YAML must be a map")
		return
	}

	provider := instance.CloudParams().Provider
	for propName, entry := range identities {
		if props[propName] != nil {
			continue
		}
		idMap, ok := entry.(map[string]interface{})
		if !ok {
			continue
		}
		identity := &iam.Identity{
			Provider:    provider,
			UserName:    stringField(idMap, "userName", "user-name"),
			Credentials: map[string]string{},
		}
		for k, v := range idMap {
			if k == "userName" || k == "user-name" {
				continue
			}
			if s := strings.TrimSpace(fmt.Sprintf("%v", v)); s != "" {
				identity.Credentials[k] = s
			}
		}
		props[propName] = identity
		log.Printf("   👤 Loaded pre-provisioned identity %s (%s)", propName, identity.UserName)
	}
}

func stringField(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			if s := strings.TrimSpace(fmt.Sprintf("%v", v)); s != "" {
				return s
			}
		}
	}
	return ""
}
