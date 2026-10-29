package kubernetes

import "strings"

// restrictedToApprovedNetworks reports whether the managed API is limited to
// approved private networks and/or a non-open source-address allowlist.
// CCC.K8S.CN01.AR01 accepts a private-only endpoint (the VNet / private
// management path) or a public endpoint locked to restrictive CIDRs.
func restrictedToApprovedNetworks(publicAccess, privateAccess bool, cidrs []string) bool {
	if privateAccess && !publicAccess {
		return true
	}
	return hasRestrictiveCIDRs(cidrs)
}

func hasRestrictiveCIDRs(cidrs []string) bool {
	if len(cidrs) == 0 {
		return false
	}
	for _, raw := range cidrs {
		cidr := strings.TrimSpace(raw)
		if cidr == "" || cidr == "0.0.0.0/0" || cidr == "::/0" {
			return false
		}
	}
	return true
}
