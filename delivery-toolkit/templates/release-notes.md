<!-- markdownlint-disable -->
# {{ .Metadata.Title }} - v{{ (lastReleaseDetails .ReleaseDetails).Version }} ({{ .Metadata.Id }})

## Summary
{{ (lastReleaseDetails .ReleaseDetails).ReleaseManager.Summary }}

### Release Manager
- **Name**: {{ (lastReleaseDetails .ReleaseDetails).ReleaseManager.Name }}
- **GitHub ID**: [{{ (lastReleaseDetails .ReleaseDetails).ReleaseManager.GithubId }}](https://github.com/{{ (lastReleaseDetails .ReleaseDetails).ReleaseManager.GithubId }})
- **Company**: {{ (lastReleaseDetails .ReleaseDetails).ReleaseManager.Company }}

### Change Log

Below is a list of all the changes and updates included in this release. Please review them to stay informed about the latest improvements and bug fixes.
{{ if (lastReleaseDetails .ReleaseDetails).ChangeLog }}
{{ range (lastReleaseDetails .ReleaseDetails).ChangeLog }}

- {{ . }}
  {{ end }}
  {{ else }}
- No changes documented.
  {{ end }}

### Contributors
{{ range (lastReleaseDetails .ReleaseDetails).Contributors }}
- {{ .Name }}, {{ .Company }} - @{{ .GithubId }}
{{ end }}

**Thank you to all the contributors for your valuable efforts and contributions to this release! The work that you all have completed is greatly appreciated!**

---

## FAQ / Feedback

If you have any questions or feedback regarding this release, please reach out to the release manager or any of the contributors listed above. You can also [create an issue](https://github.com/finos/common-cloud-controls/issues) on the repository for further discussion. Cheers!
<!-- markdownlint-enable -->
