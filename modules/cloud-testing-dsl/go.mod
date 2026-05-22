module github.com/finos/common-cloud-controls/cloud-testing-dsl

go 1.24.0

require (
	github.com/PaesslerAG/jsonpath v0.1.1
	github.com/cucumber/godog v0.14.1
	github.com/finos/common-cloud-controls/cloud-api v0.0.0
	github.com/robmoffat/standard-cucumber-steps/go v1.0.5
	gopkg.in/yaml.v3 v3.0.1
)

replace github.com/finos/common-cloud-controls/cloud-api => ../cloud-api
