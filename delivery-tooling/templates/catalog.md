<!-- markdownlint-disable -->
# {{ .Metadata.ID }} v{{ .LatestReleaseDetails.Version }} ({{ .Metadata.Title }})

<img height="250px" src="https://github.com/finos/branding/blob/master/project-logos/active-project-logos/FINOS%20Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal.svg?raw=true" alt="CCC Logo"/>

{{ .Metadata.Description }}

## Release Notes

> _{{ .LatestReleaseDetails.ReleaseManager.Summary }}_

Release Manager - **{{ .LatestReleaseDetails.ReleaseManager.Name }}, {{ .LatestReleaseDetails.ReleaseManager.Company }}** ([{{ .LatestReleaseDetails.ReleaseManager.GithubId }}](https://github.com/{{ .LatestReleaseDetails.ReleaseManager.GithubId }}))

## Changes Since Last Release
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

|Threat ID|Threat Title|
|----|----|
{{- range .Threats }}
|{{ .ID }}|{{ .Title }}|
{{- end }}

---
{{ range .Threats }}
### {{ .ID }} - {{ .Title }}

**Description:** {{ .Description }}

**Related Features:**
{{ range .Features }}
  - {{ . }}
{{- end }}

**Related MITRE ATT&CK Values:**
{{ range .MITRETechnique }}
  - {{ . }}
{{- end }}
{{ end }}

## Controls

|Control ID|Control Title|
|----|----|
{{- range .Controls }}
|{{ .ID }}|{{ .Title }}|
{{- end }}

---
{{ range .Controls }}
### {{ .ID }} - {{ .Title }}

**Objective:** {{ .Objective }}

**Control Family:** {{ .ControlFamily}}

**NIST CSF:** {{ .NISTCSF }}

**Mitigated Threats:**
{{ if .Threats }}
{{ range .Threats }}
  - {{ . }}
{{- end }}
{{- else }}
_No mitigated threats._
{{- end }}

**Control Mappings:**
{{if .ControlMappings}}
{{ range $key, $value := .ControlMappings }}
{{- if $value }}
{{- range $value }}
  - {{ $key }} {{ . }}
{{- end }}
{{- end }}
{{- end }}
{{else}}
_No control mappings added._
{{end}}
{{ end }}

## Contributing Organizations

We would like to acknowledge the following organizations for their valuable contributions to this project:

{{ insertSVGs }}
<!-- markdownlint-enable -->
