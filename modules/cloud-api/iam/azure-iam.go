package iam

import (
	"context"
	"fmt"

	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// AzureIAMService implements IAMService for Azure.
type AzureIAMService struct{}

// NewAzureIAMService creates a new Azure IAM service.
func NewAzureIAMService(_ context.Context, _ types.Config) (*AzureIAMService, error) {
	return &AzureIAMService{}, nil
}

// GetAccess is not implemented for Azure (use pre-provisioned principals in test-identities).
func (s *AzureIAMService) GetAccess(userName string, serviceID string) (string, string, error) {
	return "", "", fmt.Errorf("GetAccess not implemented for Azure IAM (user %q, service %q)", userName, serviceID)
}
