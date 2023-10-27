# Relational Database Management Systems Taxonomy

This _service-level taxonomy_ documents the minimual set of features
that should be present for a service to be considered portable for
use in financial services ecosystems.

## Taxonomy

| Taxonomy ID | Feature | Description |
| ----------- | ------- | ----------- |
| CCC-RDMS-1  | SQL Support | Properly handle queries in the SQL language. |
| CCC-RDMS-2  | Vertical Scaling | Users may increase or decrease resource allocation. |
| CCC-RDMS-3  | Horizontal Scaling | Read replicas of the primary database can be created. |
| CCC-RDMS-4  | Multi-region | Read replicas can be created in multiple user-specified regions. |
| CCC-RDMS-5  | Automated Backups | Backups can be automatically created and stored according to user specification. |
| CCC-RDMS-6  | Point in Time Recovery | Backups can be restored on demand to a specific point in time. |
| CCC-RDMS-7  | Encryption at Rest | Data is encrypted at rest, and can be encrypted with user private keys. |
| CCC-RDMS-8  | Encryption in Transit | Data is encrypted in transit, and can be encrypted with user private keys. |
| CCC-RDMS-9  | Role Based Access Control | Users can be assigned roles with specific permissions. |
| CCC-RDMS-10  | Logging | Configurable logs are available for user inspection. |
| CCC-RDMS-11 | Monitoring | Configurable metrics are available for user inspection. |
| CCC-RDMS-12 | Alerting | Configurable alerts can be enabled. |
| CCC-RDMS-13 | Failover | Standby database is trasitioned to the primary after the primary fails or become unreachable. |
