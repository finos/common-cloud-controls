# AI RAG Reference Architecture: Service Mapping

This document outlines the services of interest within the AI Readiness Architecture (RAG) being developed by the **[FINOS AI Readiness Special Interest Group (SIG)](https://www.finos.org/ai-readiness)**. The table below provides a mapping of **CCC Service Families** to equivalent services in **GCP**, **Azure**, and **AWS** cloud platforms, with a focus on core AI and supporting services.

## Service Mapping Table

| **CCC Service Family**                           | **GCP Service**              | **Azure Service**                                    | **AWS Service**                       |
| ------------------------------------------------ | ---------------------------- | ---------------------------------------------------- | ------------------------------------- |
| **Artificial Intelligence and Machine Learning** | Vertex AI                    | Azure Machine Learning                               | Amazon SageMaker                      |
| **Compute Services**                             | Cloud Run                    | Azure Container Apps, Azure Kubernetes Service (AKS) | AWS Lambda, Amazon ECS, Amazon EKS    |
| **Database Servicese**                           | AlloyDB for PostgreSQL       | Azure Cosmos DB, Azure PostgreSQL                    | Amazon Aurora (PostgreSQL compatible) |
| **Networking Services**                          | Virtual Private Cloud        | Azure Virtual Network (VNet)                         | Amazon VPC                            |
| **Cryptographic Services**                       | Cloud KMS                    | Azure Key Vault                                      | AWS Key Management Service (KMS)      |
| **Storage Servicese**                            | Cloud Storage                | Azure Blob Storage                                   | Amazon S3                             |
| **Identity Services**                            | Identity & Access Management | Azure Active Directory, Managed Identity             | AWS IAM                               |
| **Management and Governance Services**           | Cloud Logging                | Azure Monitor, Log Analytics                         | Amazon CloudWatch                     |

## Additional Notes

- **Scope**: This mapping focuses on foundational and supporting services critical to building an AI-ready architecture. These services cover model development, deployment, storage, connectivity, security, and monitoring.
- **Alignment with FINOS AI Readiness SIG**: This mapping is aligned with the goals of the AI Readiness SIG, emphasizing secure, scalable, and compliant architectures for AI pipelines in financial services.
