# Common Cloud Services Taxonomy

- [Storage Services](#storage-services)
  - [Object Storage](#object-storage)
  - [Block Storage](#block-storage)
  
- [Database Services](#database-services)
  - [Relational Databases](#relational-databases)
  - [NoSQL Databases](#nosql-databases)

## Storage Services

### Object Storage

- **AWS**: Amazon S3
- **Azure**: Azure Blob Storage
- **Google Cloud**: Google Cloud Storage

### Block Storage

Managed Services:

- **AWS**: Amazon EBS
- **Azure**: Azure Disk Storage
- **Google Cloud**: Google Persistent Disk

## Database Services

### Relational Databases

Managed Services:

- **AWS**: Amazon RDS
- **Azure**: Azure Database for MySQL, SQL Database (SQL Server)
- **Google Cloud**: Cloud SQL

Service Level Taxonomy:

- SQL Support - Properly handle queries in the SQL language.
- Vertical Scaling - Increase or decrease resource allocation.
- Horizontal Scaling - Read replicas of the primary database can be created.
- Multi-region - Read replicas can be created in multiple user-specified regions.
- Automated Backups - Backups can be automatically created and stored according to user specification.
- Point in Time Recovery - Backups can be restored on demand to a specific point in time.
- Encryption at Rest - Data is encrypted at rest, and can be encrypted with user private keys.
- Encryption in Transit - Data is encrypted in transit, and can be encrypted with user private keys.
- Role Based Access Control - Users can be assigned roles with specific permissions.
- Logging - Configurable logs are available for user inspection.
- Monitoring - Configurable metrics are available for user inspection.
- Alerting - Configurable alerts can be enabled.
- Failover - Standby database can be implemented for failover when the primary can't be reached.

[(read more)](database/relational/taxonomy.md)

### NoSQL Databases

- **AWS**: Amazon DynamoDB
- **Azure**: Azure Cosmos DB
- **Google Cloud**: Google Cloud Bigtable, Firestore

## References

- [AWS Services](https://aws.amazon.com/products/)
- [Azure Services](https://azure.microsoft.com/en-us/services/)
- [Google Cloud Services](https://cloud.google.com/products/)
