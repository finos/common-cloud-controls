# Controls: Relational Database Management Systems

This _service-level controls_ documents an abstracted list of controls based on the [Threats for Relational Database Management Systems](./threats.md). The scope of these controls expand across cloud service providers. The controls gherkin feature file can be located [here].(./tests/controls.feature).

## Controls Catalog

| Control ID  | Objective                                                | Description                                                        | NIST CSF | MITRE ATT&CK Mitigations                            | Threats     |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------ | -------- | --------------------------------------------------- | ----------- |
| CCC.RDMS.C1 | Enforce Role-Based Access Control                        | Ensure only authorized roles can access database resources.        | Protect  | [M1041](https://attack.mitre.org/mitigations/M1041) | [CCC.RDMS.T1](./threats.md/#CCC.RDMS.T1) [CCC.RDMS.T4](./threats.md/#CCC.RDMS.T4) |
| CCC.RDMS.C2 | Disable Access with Default Credentials                  | Ensure only authorized roles can access database resources.        | Protect  | [M1041](https://attack.mitre.org/mitigations/M1041) | [CCC.RDMS.T1](./threats.md/#CCC.RDMS.T1) |
| CCC.RDMS.C3 | Restrict Snapshot Collection To Trusted Roles            | Limit snapshot collection capabilities to trusted roles.           | Protect  | [M1054](https://attack.mitre.org/mitigations/M1054) | [CCC.RDMS.T2](./threats.md/#CCC.RDMS.T2) |
| CCC.RDMS.C4 | Restrict Snapshot Collection to Trusted Organization     | Limit snapshot export capabilities to trusted organization.        | Protect  | [M1054](https://attack.mitre.org/mitigations/M1054) | [CCC.RDMS.T2](./threats.md/#CCC.RDMS.T2) |
| CCC.RDMS.C5 | Enforce Logging & Monitoring                             | Ensure logging and monitoring cannot be disabled by users.         | Protect  | [M1030](https://attack.mitre.org/mitigations/M1030) | [CCC.RDMS.T3](./threats.md/#CCC.RDMS.T3) [CCC.RDMS.T4](./threats.md/#CCC.RDMS.T4)|
| CCC.RDMS.C6 | Deny Unencrypted Connections                              | Require encrypted connections for all database access.             | Protect  | [M1041](https://attack.mitre.org/mitigations/M1041) | [CCC.RDMS.T5](./threats.md/#CCC.RDMS.T6) |
| CCC.RDMS.C7 | Validate Encryption Keys for Database Snapshots          | Ensure only authorized encryption keys are used for snapshots.     | Protect  | [M1042](https://attack.mitre.org/mitigations/M1042) | [CCC.RDMS.T6](./threats.md/#CCC.RDMS.T7) |
