package iam

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// GCPIAMService implements IAMService for GCP.
type GCPIAMService struct{}

// NewGCPIAMService creates a new GCP IAM service.
func NewGCPIAMService(_ context.Context, _ types.Config) (*GCPIAMService, error) {
	return &GCPIAMService{}, nil
}

// GetAccess is not implemented for GCP (use pre-provisioned service accounts in test-identities).
func (s *GCPIAMService) GetAccess(userName string, serviceID string) (string, string, error) {
	return "", "", fmt.Errorf("GetAccess not implemented for GCP IAM (user %q, service %q)", userName, serviceID)
}
