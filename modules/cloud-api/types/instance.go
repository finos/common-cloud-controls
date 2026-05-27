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
	ReceiverVpcId                string
	NonAllowlistedRequesterVpcId string
	AllowedRequesterVpcIds       []string
	DisallowedRequesterVpcIds    []string
	AllowedRequesterVpcIdsCsv    string
	DisallowedRequesterVpcIdsCsv string
	FlowLogGroupName             string
	BadVpcId                     string
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
		ReceiverVpcId:                propString(props, "receiver-vpc-id"),
		NonAllowlistedRequesterVpcId: propString(props, "non-allowlisted-requester-vpc-id"),
		AllowedRequesterVpcIds:       propStringSlice(props, "allowed-requester-vpc-ids"),
		DisallowedRequesterVpcIds:    propStringSlice(props, "disallowed-requester-vpc-ids"),
		AllowedRequesterVpcIdsCsv:    propString(props, "allowed-requester-vpc-ids-csv"),
		DisallowedRequesterVpcIdsCsv: propString(props, "disallowed-requester-vpc-ids-csv"),
		FlowLogGroupName:             propString(props, "flow-log-group-name"),
		BadVpcId:                     propString(props, "bad-vpc-id"),
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
