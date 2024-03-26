| Key      | Value    |
|----------|----------|
| Control Id   | CCC.OS.C1   |
| Objective | Enforce encryption-in-transit |
| Description   | Block all unencrypted requests to the object storage bucket you control |
| Test | GIVEN you own the object storage bucket; WHEN an unencrypted HTTP request is made to the bucket; THEN the request should be denied |
| Service Taxonomy Id  | CCC-020115 |
| NIST CF  | Protect  |
| MITRE ATT&CK Mitigations | [M1041](https://attack.mitre.org/mitigations/M1041) |
| Threats | CCC.OS.T1 |

| Key      | Value    |
|----------|----------|
| Control Id   | CCC.OS.C2   |
| Objective | Block requests with KMS keys from unauthorized principals |
| Description   | Block requests with unauthorized AWS account providing the KMS key |
| Test | GIVEN you own the object storage bucket; WHEN a request encrypted with a KMS key from an unauthorized principal is made to the bucket; THEN the request should be denied |
| Service Taxonomy Id  | CCC-020114 |
| NIST CF  | Protect  |
| MITRE ATT&CK Mitigations | None|
| Threats | CCC.OS.T2 |
