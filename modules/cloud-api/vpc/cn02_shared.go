package vpc

import (
	"fmt"
	"sort"
	"strings"
)

// cn02IsPublicSubnetName matches integration fixture subnets (e.g. finos-ccc-integration-vpc-public).
func cn02IsPublicSubnetName(name string) bool {
	name = strings.ToLower(strings.TrimSpace(name))
	return strings.HasSuffix(name, "-public") || strings.Contains(name, "-vpc-public")
}

func cn02SelectFirstPublicSubnet(vpcID string, rows []map[string]interface{}) (map[string]interface{}, error) {
	if len(rows) == 0 {
		return nil, fmt.Errorf("no public subnets found for VPC %s", vpcID)
	}
	sort.Slice(rows, func(i, j int) bool {
		return strings.TrimSpace(fmt.Sprintf("%v", rows[i]["SubnetId"])) <
			strings.TrimSpace(fmt.Sprintf("%v", rows[j]["SubnetId"]))
	})
	selected := rows[0]
	return map[string]interface{}{
		"VpcId":                vpcID,
		"SubnetId":             strings.TrimSpace(fmt.Sprintf("%v", selected["SubnetId"])),
		"RouteTableId":         strings.TrimSpace(fmt.Sprintf("%v", selected["RouteTableId"])),
		"MapPublicIpOnLaunch":  boolFromEvidence(selected["MapPublicIpOnLaunch"]),
		"PublicSubnetCount":    len(rows),
		"SelectionDescription": "first public subnet by SubnetId",
	}, nil
}
