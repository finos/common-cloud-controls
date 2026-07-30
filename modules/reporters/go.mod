module github.com/finos/common-cloud-controls/reporters

go 1.25.0

require (
	github.com/cucumber/godog v0.14.1
	github.com/cucumber/messages/go/v21 v21.0.1
	github.com/finos/common-cloud-controls/cloud-api v0.0.0
	github.com/gemaraproj/go-gemara v0.5.0
)

require (
	github.com/goccy/go-yaml v1.19.2 // indirect
	github.com/gofrs/uuid v4.3.1+incompatible // indirect
	github.com/spf13/pflag v1.0.10 // indirect
)

replace github.com/finos/common-cloud-controls/cloud-api => ../cloud-api
