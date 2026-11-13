package kubernetes

import (
	"errors"
	"net"
	"strings"
)

// APIUnreachableError is a transport failure reaching the Kubernetes API
// (DNS, dial, routing). It is not an admission or authorization decision.
type APIUnreachableError struct {
	Err error
}

func (e *APIUnreachableError) Error() string {
	if e == nil || e.Err == nil {
		return "Kubernetes API unreachable"
	}
	return "Kubernetes API unreachable: " + e.Err.Error()
}

func (e *APIUnreachableError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

func apiUnreachable(err error) error {
	if err == nil {
		return nil
	}
	if IsAPIUnreachable(err) {
		var existing *APIUnreachableError
		if errors.As(err, &existing) {
			return err
		}
		return &APIUnreachableError{Err: err}
	}
	return err
}

// IsAPIUnreachable reports DNS/dial/routing failures. Admission features must
// not treat these as "Denied".
func IsAPIUnreachable(err error) bool {
	if err == nil {
		return false
	}
	var unreachable *APIUnreachableError
	if errors.As(err, &unreachable) {
		return true
	}
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return true
	}
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		return true
	}
	msg := strings.ToLower(err.Error())
	for _, needle := range []string{
		"no such host",
		"server misbehaving",
		"connection refused",
		"network is unreachable",
		"no route to host",
		"i/o timeout",
		"dial tcp",
		"dial udp",
		"missingaadclustertoken",
		"aks runcommand",
		"aks-command-invoke",
		"unknown (get ",
		"unknown (list ",
	} {
		if strings.Contains(msg, needle) {
			return true
		}
	}
	return false
}
