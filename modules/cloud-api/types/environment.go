package types

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

// EnvironmentConfig is the top-level structure of types.yaml
type EnvironmentConfig struct {
	Instances []InstanceConfig `yaml:"instances"`
}

// InstanceConfig represents a named cloud environment instance
type InstanceConfig struct {
	ID         string                 `yaml:"id"`
	Properties CloudParams            `yaml:"properties"`
	Services   []ServiceConfig        `yaml:"services"`
	Rules      map[string]interface{} `yaml:"rules"`
}

// ServiceConfig represents a service within an instance.
// The "type" key identifies the service; all other keys are service-specific properties.
type ServiceConfig struct {
	Type       string
	Properties map[string]interface{}
}

// CloudParams returns the instance's CloudParams (Provider is already in Properties).
func (ic InstanceConfig) CloudParams() CloudParams {
	return ic.Properties
}

// ServiceProperties returns the properties map for the named service type, or nil if not found.
func (ic InstanceConfig) ServiceProperties(serviceType string) map[string]interface{} {
	for _, svc := range ic.Services {
		if svc.Type == serviceType {
			return svc.Properties
		}
	}
	return nil
}

// VpcServiceConfig holds typed VPC service properties from the environment.yaml vpc block.
// All fields map directly to their kebab-case counterparts in the yaml vpc service block.
type VpcServiceConfig struct {
	Cn03ReceiverVpcId                string
	Cn03NonAllowlistedRequesterVpcId string
	Cn03AllowedRequesterVpcIds       []string
	Cn03DisallowedRequesterVpcIds    []string
	Cn03AllowedRequesterVpcIdsCsv    string
	Cn03DisallowedRequesterVpcIdsCsv string
	Cn04FlowLogGroupName             string
	BadVpcId                         string
}

// VpcServiceConfig returns typed VPC service properties for this instance.
// Returns a zero-value struct if no vpc service block is configured.
func (ic InstanceConfig) VpcServiceConfig() VpcServiceConfig {
	props := ic.ServiceProperties("vpc")
	if props == nil {
		return VpcServiceConfig{}
	}
	return VpcServiceConfig{
		Cn03ReceiverVpcId:                vpcPropString(props, "cn03-receiver-vpc-id"),
		Cn03NonAllowlistedRequesterVpcId: vpcPropString(props, "cn03-non-allowlisted-requester-vpc-id"),
		Cn03AllowedRequesterVpcIds:       vpcPropStringSlice(props, "cn03-allowed-requester-vpc-ids"),
		Cn03DisallowedRequesterVpcIds:    vpcPropStringSlice(props, "cn03-disallowed-requester-vpc-ids"),
		Cn03AllowedRequesterVpcIdsCsv:    vpcPropString(props, "cn03-allowed-requester-vpc-ids-csv"),
		Cn03DisallowedRequesterVpcIdsCsv: vpcPropString(props, "cn03-disallowed-requester-vpc-ids-csv"),
		Cn04FlowLogGroupName:             vpcPropString(props, "cn04-flow-log-group-name"),
		BadVpcId:                         vpcPropString(props, "bad-vpc-id"),
	}
}

func vpcPropString(props map[string]interface{}, key string) string {
	if v, ok := props[key]; ok {
		if v == nil {
			return ""
		}
		s := strings.TrimSpace(fmt.Sprintf("%v", v))
		if s == "<nil>" {
			return ""
		}
		return s
	}
	return ""
}

func vpcPropStringSlice(props map[string]interface{}, key string) []string {
	if v, ok := props[key]; ok {
		switch tv := v.(type) {
		case []interface{}:
			out := make([]string, 0, len(tv))
			for _, item := range tv {
				if s := strings.TrimSpace(fmt.Sprintf("%v", item)); s != "" {
					out = append(out, s)
				}
			}
			return out
		case []string:
			return tv
		case string:
			if s := strings.TrimSpace(tv); s != "" {
				return []string{s}
			}
		}
	}
	return []string{}
}

func (s *ServiceConfig) UnmarshalYAML(value *yaml.Node) error {
	var raw map[string]interface{}
	if err := value.Decode(&raw); err != nil {
		return err
	}
	if t, ok := raw["type"].(string); ok {
		s.Type = t
	}
	s.Properties = make(map[string]interface{})
	for k, v := range raw {
		if k != "type" {
			s.Properties[k] = v
		}
	}
	return nil
}
