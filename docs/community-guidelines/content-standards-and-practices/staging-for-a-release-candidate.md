# How to Prepare a Service for a Release Candidate

This guide explains how to audit and update threats and controls for a specific cloud service in the FINOS Common Cloud Controls project, ensuring it is ready to be released. By following these steps, contributors will produce high-quality, consistent outputs aligned with our “common” and “service-specific” model.

---

## Table of Contents

- [How to Prepare a Service for a Release Candidate](#how-to-prepare-a-service-for-a-release-candidate)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Conceptual Diagram](#conceptual-diagram)
    - [Key Points](#key-points)
  - [Preparing Threats](#preparing-threats)
  - [Preparing Controls](#preparing-controls)
  - [Final Checks and Pull Request](#final-checks-and-pull-request)
  - [Additional Resources](#additional-resources)

---

## Overview

When preparing a cloud service (e.g., `services/networking/loadbalancer`) for a release candidate, you will:

1. **Identify & validate existing threats** (both common and service-specific).
2. **Remove duplicates** by leveraging the “shared-threats” reference.
3. **Identify & validate existing controls** (both common and service-specific).
4. **Remove duplicates** by leveraging the “shared-controls” reference.
5. **Confirm ID ordering** and naming consistency.
6. **Ensure adherence to style guides** for threats and controls.

Perform these tasks in the `threats.yaml` and `controls.yaml` files located under the service you’re auditing or in new files if they do not yet exist.

---

## Conceptual Diagram

### Key Points

- **Common artifacts** (Capabilities, Threats, Controls) are designed to be reusable across multiple services.
- **Service-specific artifacts** build on or refine the common artifacts where the needs of the service differ from the norm.
- When preparing for a release candidate, **minimize duplication** by referencing the common artifacts whenever possible.

---

## Preparing Threats

Threats for a given service typically reside in a `threats.yaml` file (e.g., `services/networking/loadbalancer/threats.yaml`). If none exists, create a new file.

1. **Check Alignment With Service Capabilities**

   - Open `capabilities.yaml` in the same directory (e.g., `services/networking/loadbalancer/capabilities.yaml`).
   - Ensure existing threats in `threats.yaml` correspond to these capabilities. Confirm IDs, titles, and descriptions are consistent and relevant.

2. **Add Any Missing Common Threats**

   - Review the [shared-threats.yaml](/services/shared-threats.yaml) to see the full list of common threats.
   - In `threats.yaml`, find or create a top-level `common_threats` key.
   - Add references to any relevant common threats not already included.
   - See an example of a fully populated list in the [object storage threats.yaml](/services/storage/object/threats.yaml).

3. **Add Any Missing Service-Specific Threats**

   - Under the top-level `threats` list, define any threats unique to this service that are not already captured as “common threats.”
   - Use the object storage example (linked above) as a guide.

4. **Remove Duplications**

   - If a threat already exists in `shared-threats.yaml` but is also listed separately under `threats`, move or reference it under `common_threats` and remove the duplicate.
   - This step ensures we don’t maintain two versions of the same threat.

5. **Check ID Ordering**

   - IDs for threats should be sequential and grouped properly.
   - Make sure newly added items fit into the numerical sequence without breaking existing references.

6. **Final Review Against the Style Guide**
   - Refer to the [Threat Definitions Style Guide](/docs/community-guidelines/content-standards-and-practices/threat-definitions.md).
   - Check titles, descriptions, and formatting match these standards.

---

## Preparing Controls

Controls for a given service typically reside in a `controls.yaml` file (e.g., `services/networking/loadbalancer/controls.yaml`). If none exists, create a new file.

1. **Check Alignment With Threats**

   - Ensure that every threat in `threats.yaml` is appropriately mitigated by at least one control in `controls.yaml` (or by a “common control” reference).
   - Verify IDs, titles, and descriptions match the relevant threats where applicable.

2. **Add Any Missing Common Controls**

   - Review the [shared-controls.yaml](/services/shared-controls.yaml).
   - In your `controls.yaml`, find or create a top-level `common_controls` key.
   - Add references to any relevant common controls not already included.
   - See the [object storage controls.yaml](/services/storage/object/controls.yaml) for an example.

3. **Add Any Missing Service-Specific Controls**

   - Under the `controls` list, add controls that are specific to your service’s unique threats or capabilities.
   - Ensure each new control has a clear and accurate title, description, and testing requirement if appropriate.

4. **Remove Duplications**

   - If a control is already provided in `shared-controls.yaml` but also exists as a service-specific control, migrate or reference it under `common_controls` and remove the duplicate from `controls`.

5. **Check ID Ordering**

   - Ensure the IDs are in the correct numerical order and don’t conflict with existing controls.

6. **Final Review Against the Style Guide**
   - Refer to the [Control Definitions Style Guide](/docs/community-guidelines/content-standards-and-practices/control-definitions.md).
   - Validate all controls and their testing requirements align with these standards.

---

## Final Checks and Pull Request

1. **Create or Update the Files**

   - Commit your updated or newly created `threats.yaml` and `controls.yaml` to a feature branch.

2. **Self-Review**

   - Confirm all the boxes in the [Preparing Threats](#preparing-threats) and [Preparing Controls](#preparing-controls) sections are checked.
   - Ensure the numbering and referencing are accurate.

3. **Open a Pull Request**

   - Submit a PR from your feature branch to the main branch of the [finos/common-cloud-controls](https://github.com/finos/common-cloud-controls) repository.
   - Reference the relevant issue (e.g., “resolves #12345”) and summarize your changes.

4. **Request Review**

   - Assign members of the Security Working Group or other relevant maintainers.
   - Incorporate feedback where needed.

5. **Merge**
   - Once approved, merge your PR. Your service is now ready for the release candidate!

---

## Additional Resources

- **Common Threats**
  [services/shared-threats.yaml](/services/shared-threats.yaml)

- **Common Controls**
  [services/shared-controls.yaml](/services/shared-controls.yaml)

- **Example Completed Service**

  - Threats: [services/storage/object/threats.yaml](/services/storage/object/threats.yaml)
  - Controls: [services/storage/object/controls.yaml](/services/storage/object/controls.yaml)

- **Style Guides**

  - [Threat Definitions](/docs/community-guidelines/content-standards-and-practices/threat-definitions.md)
  - [Control Definitions](/docs/community-guidelines/content-standards-and-practices/control-definitions.md)

- **Contact & Discussion**
  - If you have questions or need clarification, contact the Security Working Group or open a discussion/issue on the repository.

---

**Thank you for contributing to the FINOS Common Cloud Controls project!** By following these guidelines, you help ensure that each service’s threats and controls are consistent, complete, and ready for a smooth release.
