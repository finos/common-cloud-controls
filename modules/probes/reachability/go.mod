module github.com/finos/common-cloud-controls/probes/reachability

go 1.25.0

require (
	github.com/aws/aws-lambda-go v1.47.0
	github.com/awslabs/aws-lambda-go-api-proxy v0.16.2
	github.com/finos/common-cloud-controls/cloud-api v0.0.0
)

replace github.com/finos/common-cloud-controls/cloud-api => ../../cloud-api
