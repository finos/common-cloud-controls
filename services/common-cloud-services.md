# Common Cloud Services Taxonomy

- [Compute Services](#compute-services)
  - [Virtual Machines (VMs)](#virtual-machines-vms)
  - [Serverless Computing](#serverless-computing)

- [Storage Services](#storage-services)
  - [Object Storage](#object-storage)
  - [Block Storage](#block-storage)
  
- [Database Services](#database-services)
  - [Relational Databases](#relational-databases)
  - [NoSQL Databases](#nosql-databases)
  
- [Networking Services](#networking-services)
  - [Content Delivery Network (CDN)](#content-delivery-network-cdn)
  - [Load Balancers](#load-balancers)
  
- [Identity and Access Management (IAM)](#identity-and-access-management-iam)
  - [Identity Services](#identity-services)
  
- [Analytics Services](#analytics-services)
  - [Big Data and Analytics](#big-data-and-analytics)
  
- [Containers and Orchestration](#containers-and-orchestration)
  - [Container Services](#container-services)
  
- [AI and Machine Learning](#ai-and-machine-learning)
  - [Machine Learning Services](#machine-learning-services)
  
- [DevOps and CI/CD](#devops-and-cicd)
  - [DevOps Services](#devops-services)
  
- [Security Services](#security-services)
  - [Security and Compliance](#security-and-compliance)
  
- [Monitoring and Management](#monitoring-and-management)
  - [Monitoring Services](#monitoring-services)
  - [Management Services](#management-services)

## Compute Services

### Virtual Machines (VMs)

- **AWS**: Amazon EC2
- **Azure**: Azure Virtual Machines
- **Google Cloud**: Google Compute Engine

### Serverless Computing

- **AWS**: AWS Lambda
- **Azure**: Azure Functions
- **Google Cloud**: Google Cloud Functions

## Storage Services

### Object Storage

- **AWS**: Amazon S3
- **Azure**: Azure Blob Storage
- **Google Cloud**: Google Cloud Storage

### Block Storage

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

[(read more)](database/relational/taxonomy.md)

### NoSQL Databases

- **AWS**: Amazon DynamoDB
- **Azure**: Azure Cosmos DB
- **Google Cloud**: Google Cloud Bigtable, Firestore

## Networking Services

### Content Delivery Network (CDN)

- **AWS**: Amazon CloudFront
- **Azure**: Azure Content Delivery Network
- **Google Cloud**: Google Cloud CDN

### Load Balancers

- **AWS**: Elastic Load Balancing
- **Azure**: Azure Load Balancer
- **Google Cloud**: Google Cloud Load Balancing

## Identity and Access Management (IAM)

### Identity Services

- **AWS**: AWS Identity and Access Management (IAM)
- **Azure**: Azure Active Directory
- **Google Cloud**: Google Identity Platform

## Analytics Services

### Big Data and Analytics

- **AWS**: Amazon EMR, AWS Glue
- **Azure**: Azure HDInsight, Azure Data Lake Analytics
- **Google Cloud**: Google Cloud Dataprep, BigQuery

## Containers and Orchestration

### Container Services

- **AWS**: Amazon ECS, Amazon EKS
- **Azure**: Azure Kubernetes Service (AKS)
- **Google Cloud**: Google Kubernetes Engine (GKE)

## AI and Machine Learning

### Machine Learning Services

- **AWS**: Amazon SageMaker
- **Azure**: Azure Machine Learning
- **Google Cloud**: Google AI Platform

## DevOps and CI/CD

### DevOps Services

- **AWS**: AWS CodePipeline, AWS CodeDeploy
- **Azure**: Azure DevOps
- **Google Cloud**: Google Cloud Build

## Security Services

### Security and Compliance

- **AWS**: AWS Identity and Access Management (IAM), AWS Key Management Service (KMS)
- **Azure**: Azure Active Directory, Azure Key Vault
- **Google Cloud**: Google Identity Platform, Google Cloud Key Management Service (KMS)

## Monitoring and Management

### Monitoring Services

- **AWS**: Amazon CloudWatch
- **Azure**: Azure Monitor
- **Google Cloud**: Google Cloud Monitoring

### Management Services

- **AWS**: AWS Management Console
- **Azure**: Azure Portal
- **Google Cloud**: Google Cloud Console

## References

- [AWS Services](https://aws.amazon.com/products/)
- [Azure Services](https://azure.microsoft.com/en-us/services/)
- [Google Cloud Services](https://cloud.google.com/products/)
