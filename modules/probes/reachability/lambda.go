//go:build lambda

package main

import (
	"log/slog"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
)

// Lambda entry for API Gateway HTTP API (payload 2.0). Built with -tags lambda.
func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	config, err := loadConfig()
	if err != nil {
		logger.Error("invalid configuration", "error", err)
		os.Exit(1)
	}
	adapter := httpadapter.NewV2(newServer(config, logger).routes())
	lambda.Start(adapter.ProxyWithContext)
}
