package main

import (
	"log"

	"github.com/finos/common-cloud-controls/cloud-api/factory"
	"github.com/finos/common-cloud-controls/cloud-api/iam"
)

// standardTestUsers are provisioned into Props before scenarios when absent.
// ObjStor behavioural features expect these keys instead of provisioning in Gherkin.
var standardTestUsers = []struct {
	propName string
	userName string
	level    string
}{
	{"testUserNoAccess", "test-user-no-access", "none"},
	{"testUserRead", "test-user-read", "read"},
	{"testUserWrite", "test-user-write", "write"},
	{"testUserAdmin", "test-user-admin-access", "admin"},
}

func provisionTestIdentities(cloudFactory factory.Factory, resourceUID string, props map[string]interface{}) {
	iamAPI, err := cloudFactory.GetServiceAPI("iam")
	if err != nil {
		log.Printf("   ⚠️  IAM not available, skipping test identity provisioning: %v", err)
		return
	}
	iamService, ok := iamAPI.(iam.IAMService)
	if !ok {
		log.Printf("   ⚠️  IAM service type mismatch, skipping test identity provisioning")
		return
	}

	for _, u := range standardTestUsers {
		if props[u.propName] != nil {
			continue
		}
		id, err := iamService.ProvisionUserWithAccess(u.userName, resourceUID, u.level)
		if err != nil {
			log.Printf("   ⚠️  Failed to provision %s: %v", u.propName, err)
			continue
		}
		props[u.propName] = id
		log.Printf("   👤 Provisioned %s (%s)", u.propName, u.userName)
	}
}
