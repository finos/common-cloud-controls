package types

import (
	"fmt"
	"strings"
)

// VpcServiceConfig holds typed VPC settings from flat Privateer vars.
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
