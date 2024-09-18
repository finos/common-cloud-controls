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

{{ range .Features }}

### {{ .ID }} - {{ .Title }}

{{ .Description }}

{{- end }}
