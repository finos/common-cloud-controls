| Key      | Value    |
|----------|----------|
| Threat Id   | CCC.OS.T1   |
| Name   | Intercept data in transit to an external bucket   |
| Description   | Object storage service allows communication over HTTP. An attacker can intercept the traffic you send to an external bucket, in order to read or modify the data.  |
| Service Taxonomy Id  | CCC-020115   |
| MITRE ATT&CK TTPs | [TA009](https://attack.mitre.org/tactics/TA0009/) [T1557](https://attack.mitre.org/techniques/T1557/)  |


| Key      | Value    |
|----------|----------|
| Threat Id   | CCC.OS.T2   |
| Name   | Objects encrypted for ransomware   |
| Description   | Object storage service provides several types of encryption where the key is not operated by the CSP (e.g. SSE-KMS with Bring Your Own Key). An attacker can encrypt all the data stored in the bucket to ransom the data owner to get the decryption key. Alternatively, an attacker can change the default encryption key, for a similar effect on any new data uploaded.  |
| Service Taxonomy Id  | CCC-020114   |
| MITRE ATT&CK TTPs | [TA0040](https://attack.mitre.org/tactics/TA0040/) [T1486](https://attack.mitre.org/techniques/T1486/)  |
