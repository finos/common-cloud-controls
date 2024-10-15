---
name: Release Proposal
about: To propose a new release candidate
title: Release Proposal - (Service Name) vYY/MM
labels:
  - release
  - delivery
assignees: "damienjburks"
---

## Overview

- Service Name:
- Desired Release Date:
- Release Manager: (This must be appointed by the Delivery Working Group)

## Release Manager Checklist

- [ ] Confirm that this service is ready by working with the following WGs:
  - [ ] Taxonomy
  - [ ] Security
  - [ ] Duplication Reduction
- [ ] Modify the `metadata.yaml` files to include the latest release details. This can be accomplished in an automated form by running the following command:

  ```text
  cd delivery-tooling
  go run . release-notes -t /services/storage/object
  ```

- [ ] Raise a PR and tag this issue number. The approver will be someone from the Delivery WG.
- [ ] Merge PR and execute the Release Pipeline, which can be found here: [Release Workflow](https://github.com/finos/common-cloud-controls/actions/workflows/release.yml).
  - You'll need to fill out the form with the "build target" and the "tag" for this release. Also, be sure to run the workflow from the "main" branch.
- [ ] Quality check the release and make changes if necessary.
- [ ] Share with the WG Leads and get their approval to move forward.
- [ ] Announce release candidate and request feedback from the Change Management Board (CMB)
- [ ] Arbitrate and triage all Change Requests (CR) from the CMB
- [ ] If 2 weeks must have passed and there are no unresolved CRs, create official release
