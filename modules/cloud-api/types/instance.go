package types

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

// InstanceConfig represents a named cloud environment instance (legacy environment YAML).
type InstanceConfig struct {
	ID         string                 `yaml:"id"`
	Properties CloudParams            `yaml:"properties"`
	Services   []ServiceConfig        `yaml:"services"`
	Rules      map[string]interface{} `yaml:"rules"`
}

// ServiceConfig represents a service within an instance.
type ServiceConfig struct {
	Type       string
	Properties map[string]interface{}
}

func (ic InstanceConfig) CloudParams() CloudParams {
	return ic.Properties
}

func (ic InstanceConfig) ServiceProperties(serviceType string) map[string]interface{} {
	for _, svc := range ic.Services {
		if svc.Type == serviceType {
			return svc.Properties
		}
	}
	return nil
}

// VpcServiceConfig holds typed VPC service properties from config.
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

func (ic InstanceConfig) VpcServiceConfig() VpcServiceConfig {
	props := ic.ServiceProperties("vpc")
	if props == nil {
		return VpcServiceConfig{}
	}
	return vpcConfigFromProps(props)
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

func vpcConfigFromProps(props map[string]interface{}) VpcServiceConfig {
	return VpcServiceConfig{
		Cn03ReceiverVpcId:                propString(props, "cn03-receiver-vpc-id"),
		Cn03NonAllowlistedRequesterVpcId: propString(props, "cn03-non-allowlisted-requester-vpc-id"),
		Cn03AllowedRequesterVpcIds:       propStringSlice(props, "cn03-allowed-requester-vpc-ids"),
		Cn03DisallowedRequesterVpcIds:    propStringSlice(props, "cn03-disallowed-requester-vpc-ids"),
		Cn03AllowedRequesterVpcIdsCsv:    propString(props, "cn03-allowed-requester-vpc-ids-csv"),
		Cn03DisallowedRequesterVpcIdsCsv: propString(props, "cn03-disallowed-requester-vpc-ids-csv"),
		Cn04FlowLogGroupName:             propString(props, "cn04-flow-log-group-name"),
		BadVpcId:                         propString(props, "bad-vpc-id"),
	}
}

func propString(props map[string]interface{}, key string) string {
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

func propStringSlice(props map[string]interface{}, key string) []string {
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
	return nil
}
