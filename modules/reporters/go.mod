module github.com/finos/common-cloud-controls/reporters

go 1.24.0

require (
	github.com/cucumber/godog v0.14.1
	github.com/cucumber/messages/go/v21 v21.0.1
	github.com/finos/common-cloud-controls/cloud-api v0.0.0
	github.com/gemaraproj/go-gemara v0.4.0
)

replace github.com/finos/common-cloud-controls/cloud-api => ../cloud-api
