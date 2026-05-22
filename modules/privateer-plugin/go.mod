module github.com/finos/common-cloud-controls/privateer-plugin

go 1.26.2

require (
	github.com/finos/common-cloud-controls/runner v0.0.0
	github.com/privateerproj/privateer-sdk v0.0.0
	github.com/spf13/cobra v1.10.2
	github.com/spf13/viper v1.21.0
)

replace (
	github.com/finos/common-cloud-controls/runner => ../runner
	github.com/finos/common-cloud-controls/cloud-api => ../cloud-api
	github.com/finos/common-cloud-controls/cloud-testing-dsl => ../cloud-testing-dsl
	github.com/finos/common-cloud-controls/reporters => ../reporters
	github.com/privateerproj/privateer-sdk => ../../../privateer-sdk
)
