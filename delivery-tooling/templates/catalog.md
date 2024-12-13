<!-- markdownlint-disable -->
# {{ .Metadata.ID }} v{{ .LatestReleaseDetails.Version }} ({{ .Metadata.Title }})

<img height="250px" src="https://raw.githubusercontent.com/finos/branding/882d52260eb9b85a4097db38b09a52ea9bb68734/project-logos/active-project-logos/Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal_BLK.svg" alt="CCC Logo"/>

{{ .Metadata.Description }}

## Release Notes

> {{ .LatestReleaseDetails.ReleaseManager.Summary }}

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

{{ .Description }}
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

{{ .Objective }}

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

{{ insertLogoWall }}
<!-- markdownlint-enable -->
