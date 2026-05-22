package reporters

import (
	"io"

	"github.com/cucumber/godog/formatters"
	"github.com/finos/common-cloud-controls/cloud-api/types"
)

// TestParams is an alias to types.TestParams for backward compatibility
type TestParams = types.TestParams

// FormatterFactory creates formatters with embedded test parameters
type FormatterFactory struct {
	params             TestParams
	attachmentProvider types.AttachmentProvider
}

// NewFormatterFactory creates a new formatter factory with the given parameters
// Optionally accepts an attachment provider as the second parameter
func NewFormatterFactory(params TestParams, attachmentProvider ...types.AttachmentProvider) *FormatterFactory {
	ff := &FormatterFactory{
		params: params,
	}
	if len(attachmentProvider) > 0 {
		ff.attachmentProvider = attachmentProvider[0]
	}
	return ff
}

// UpdateParams updates the test parameters for this factory
// Call this before running each test to ensure formatters use the correct params
func (ff *FormatterFactory) UpdateParams(params TestParams) {
	ff.params = params
}

// GetHTMLFormatterFunc returns a configured HTML formatter function
func (ff *FormatterFactory) GetHTMLFormatterFunc() func(string, io.Writer) formatters.Formatter {
	return func(suite string, out io.Writer) formatters.Formatter {
		return NewHTMLFormatterWithAttachments(suite, out, ff.params, ff.attachmentProvider)
	}
}

// GetOCSFFormatterFunc returns a configured OCSF formatter function
func (ff *FormatterFactory) GetOCSFFormatterFunc() func(string, io.Writer) formatters.Formatter {
	return func(suite string, out io.Writer) formatters.Formatter {
		return NewOCSFFormatterWithParams(suite, out, ff.params)
	}
}

// GetSummaryFormatterFunc returns a summary formatter function (collects to global, report generated at end)
func (ff *FormatterFactory) GetSummaryFormatterFunc() func(string, io.Writer) formatters.Formatter {
	return func(suite string, out io.Writer) formatters.Formatter {
		return NewSummaryFormatter(suite, out)
	}
}
