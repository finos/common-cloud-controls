package invoke

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// Context holds resolved parameters for calling cloud-api methods.
type Context struct {
	Config       types.Config
	ServiceType  string
	ResourceName string
	ResourceID   string
	VpcID        string
	SubnetID     string
	TestResource string
	FunctionName string
	Port         int
	AllowedPeers []string
	DeniedPeers  []string
}

func NewContext(cfg types.Config) *Context {
	port := 22
	if p := cfg.Get("test-listener-port", "portNumber"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	ctx := &Context{
		Config:       cfg,
		ServiceType:  firstNonEmpty(cfg.Get("ServiceType", "service"), cfg.Get("service")),
		ResourceName: cfg.Get("resource"),
		FunctionName: firstNonEmpty(cfg.Get("function-name"), cfg.Get("resource")),
		Port:         port,
		VpcID:        cfg.Get("receiver-vpc-id"),
		AllowedPeers: stringSliceVar(cfg, "allowed-requester-vpc-ids"),
		DeniedPeers:  stringSliceVar(cfg, "disallowed-requester-vpc-ids"),
	}
	return ctx
}

func (c *Context) ResolveResourceID(svc interface{ GetOrProvisionTestableResources() ([]types.TestParams, error) }) error {
	resources, err := svc.GetOrProvisionTestableResources()
	if err != nil {
		return err
	}
	if len(resources) == 0 {
		return fmt.Errorf("no testable resources returned")
	}
	var chosen *types.TestParams
	for i := range resources {
		r := &resources[i]
		if c.ResourceName != "" && strings.EqualFold(r.ResourceName, c.ResourceName) {
			chosen = r
			break
		}
	}
	if chosen == nil {
		chosen = &resources[0]
	}
	c.ResourceID = chosen.UID
	if c.ResourceName == "" {
		c.ResourceName = chosen.ResourceName
	}
	if c.VpcID == "" && c.ServiceType == "vpc" {
		c.VpcID = chosen.UID
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
