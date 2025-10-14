<!-- markdownlint-disable -->
{{ $latestRelease := latestReleaseDetails .ReleaseDetails }}

<img width="50%" src="https://raw.githubusercontent.com/finos/branding/882d52260eb9b85a4097db38b09a52ea9bb68734/project-logos/active-project-logos/Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal_BLK.svg" alt="CCC Logo"/>

# {{ .Metadata.Id }} v{{ (latestReleaseDetails .ReleaseDetails).Version }} ({{ .Metadata.Title }})

{{ .Metadata.Description }}

## Release Details

> {{ $latestRelease.ReleaseManager.Quote | safe }}
>
> _- {{ $latestRelease.ReleaseManager.Name }}, {{ $latestRelease.ReleaseManager.Company }} ([{{ $latestRelease.ReleaseManager.GithubId }}](https://github.com/{{ $latestRelease.ReleaseManager.GithubId }}))_

### Contributors to this Release

| Name | Company | GitHub ID |
| ---- | ------- | ------ |
{{- range $latestRelease.Contributors }}
| {{ .Name }} | {{ .Company }} | [{{ .GithubId }}](https://github.com/{{ .GithubId }}) |
{{- end }}

## Capabilities

The following capabilities are required to be present on a resource for it to be considered a {{ .Metadata.Title }} service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.
{{ range .CNapabilities }}
- **{{ .Id }}: {{ .Title }}**
  
  {{.Description|safe}}
{{ end }}

## Threats

The following threats have been identified based upon {{ .Metadata.Title }} service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to {{ .Metadata.Title }} services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|
{{- range .Threats }}
|{{ .Id }}|{{ .Title }}|
{{- end }}

---
{{ range .Threats }}
### {{ .Id }}

**{{ .Title }}**

**Description:** {{ .Description }}

<div class="flex-container">
  <div class="flex-item-left">
  {{ if .CNapabilities -}}
  Applies to these capabilities:
  <ul>
    {{ range .CNapabilities }}
      {{ range .Entries }}
  <li>{{ .ReferenceId }}</li>
      {{- end }}
    {{- end }}
  </ul>
  {{- end }}
  </div>
  <div class="flex-item-right">
    {{ if .ExternalMappings -}}
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Relevant External Item</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        {{- range .ExternalMappings }}
          {{- $catalogReferenceId := .ReferenceId }}
          {{- range .Entries }}
        <tr>
          <td>{{ .ReferenceId }}</td>
          <td>{{ $catalogReferenceId }}</td>
        </tr>
          {{- end }}
        {{- end }}
      </tbody>
    </table>
    {{- end }}
  </div>
</div>
{{ end }}

## Controls

The following controls have been designed to mitigate the aforementioned threats that have been identified for {{ .Metadata.Id }}. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
{{- range .ControlFamilies }}
{{- range .Controls }}
|{{ .Id }}|{{ .Title }}|
{{- end }}
{{- end }}

{{- range .ControlFamilies }}

{{- range .Controls }}

### {{ .Id }}

**{{ .Title }}**

**Objective:** {{ .Objective }}

| Assessment Requirement | Applicability |
| --- | --- |
{{- range .AssessmentRequirements }}
| {{ .Text | safe }} | {{- range .Applicability }}{{ . }}<br />{{ end }} |
{{- end }}

<div class="flex-container">
  <div class="flex-item-left">
    {{ if .ThreatMappings -}}
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Threat Catalog</th>
          <th>Related Threat</th>
        </tr>
      </thead>
      <tbody>
        {{- range .ThreatMappings }}
          {{- $catalogReferenceId := .ReferenceId }}
          {{- range .Entries }}
        <tr>
          <td>{{ $catalogReferenceId }}</td>
          <td>{{ .ReferenceId }}</td>
        </tr>
          {{- end }}
        {{- end }}
      </tbody>
    </table>
    {{- end }}
  </div>
  <div class="flex-item-right">
    {{ if .GuidelineMappings -}}
    <table cellpadding="5">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Related Guidance</th>
        </tr>
      </thead>
      <tbody>
        {{- range .GuidelineMappings }}
          {{- $catalogReferenceId := .ReferenceId }}
          {{- range .Entries }}
        <tr>
          <td>{{ $catalogReferenceId }}</td>
          <td>{{ .ReferenceId }}</td>
        </tr>
          {{- end }}
        {{- end }}
      </tbody>
    </table>
    {{- end }}
  </div>
</div>
{{- end }}
{{- end }}
