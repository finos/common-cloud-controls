module github.com/finos/common-cloud-controls/cfi-testing

go 1.24.0

require (
	github.com/cucumber/godog v0.14.1
	github.com/finos/common-cloud-controls/cloud-api v0.0.0
	github.com/finos/common-cloud-controls/cloud-testing-dsl v0.0.0
	github.com/finos/common-cloud-controls/reporters v0.0.0
	github.com/robmoffat/standard-cucumber-steps/go v1.0.5
)

replace (
	github.com/finos/common-cloud-controls/cloud-api => ../cloud-api
	github.com/finos/common-cloud-controls/cloud-testing-dsl => ../cloud-testing-dsl
	github.com/finos/common-cloud-controls/reporters => ../reporters
)
