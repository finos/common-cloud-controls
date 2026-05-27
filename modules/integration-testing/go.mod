module github.com/finos/common-cloud-controls/integration-testing

go 1.24.0

require (
	github.com/finos/common-cloud-controls/cloud-api v0.0.0
	github.com/finos/common-cloud-controls/runner v0.0.0
	gopkg.in/yaml.v3 v3.0.1
)

replace (
	github.com/finos/common-cloud-controls/cloud-api => ../cloud-api
	github.com/finos/common-cloud-controls/runner => ../runner
)
