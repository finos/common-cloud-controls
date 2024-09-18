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
{{ range .MITRE }}
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
{{ range .Threats }}
  - {{ . }}
{{- end }}

**Control Mappings:**
{{ range $key, $value := .ControlMappings }}
{{- range $value }}
  - {{ $key }} {{ . }}
{{- end }}
{{- end }}
{{ end }}