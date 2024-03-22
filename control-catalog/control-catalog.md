| Key      | Value    |
|----------|----------|
| Control Id   | CCC.OS.C1   |
| Objective | Enforce encryption-in-transit |
| Description   | Block all unencrypted requests to the object storage bucket you control |
| Test | GIVEN you own the object storage bucket; WHEN an unencrypted HTTP request is made to the bucket; THEN the request should be denied |
| Service Taxonomy Id  | CCC-020115 |
| NIST CF  | Protect  |
| Threats | CCC.OS.T1 |
