# {{ .Metadata.ID }} v{{ .LatestReleaseDetails.Version }} ({{ .Metadata.Title }})

{{ .Metadata.Description }}
---

## Release Notes

> _{{ .LatestReleaseDetails.ReleaseManager.Summary }}_

Release Manager - **{{ .LatestReleaseDetails.ReleaseManager.Name }}, {{ .LatestReleaseDetails.ReleaseManager.Company }}** ({{ .LatestReleaseDetails.ReleaseManager.GithubId }})

### Changes Since Last Release
{{ range .LatestReleaseDetails.ChangeLog }}
- {{ . }}
{{- end }}

## Features

|Feature ID|Feature Title|
|----|----|
{{- range .Features }}
|{{ .ID }}|{{ .Title }}|
{{- end }}

---
{{ range .Features }}
### {{ .ID }} - {{ .Title }}

{{ .Description }}
{{- end }}

## Threats

|Feature ID|Threat Title|
|----|----|
{{- range .Threats }}
|{{ .ID }}|{{ .Title }}|
{{- end }}

---
{{ range .Threats }}
### {{ .ID }} - {{ .Title }}

{{ .Description }}
**Related Features:**
{{ range .Features }}
  - {{ . }}
{{- end }}

**Related MITRE ATT&CK Values:**
{{ range .MITRE }}
  - {{ . }}
{{- end }}
{{ end }}
