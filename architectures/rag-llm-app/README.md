# 🤖 RAG-LLM Application Architecture: Cross-Cloud Service Mapping

This document maps the services used in a Retrieval-Augmented Generation (RAG) Large Language Model (LLM) application architecture, providing equivalents for Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP), and the CCC Service Family model.

---

## 🧠 AI/ML Services

| **Component**                 | **Google Cloud**                      | **Amazon Web Services (AWS)**                           | **Microsoft Azure**                          | **CCC Catalog**                          |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| **Vector Database**           | Vertex AI Search, AlloyDB w/ pgvector | Amazon OpenSearch Serverless w/ k-NN, Neptune Analytics | Azure AI Search (vector), Cosmos DB w/ index | [CCC.Vector](/catalogs/database/vector/) |
| **Generative Model Endpoint** | Vertex AI Gemma, GPT-4o               | Bedrock (Claude, GPT-4o, Mistral)                       | Azure OpenAI GPT-4o/4-Turbo                  | [CCC.GenAI](/catalogs/ai-ml/gen-ai/)     |

---

## 🌐 Networking and Load Balancing

| **Component**              | **Google Cloud**                      | **Amazon Web Services (AWS)**                            | **Microsoft Azure**            | **CCC Catalog**                                   |
| -------------------------- | ------------------------------------- | -------------------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| **External Load Balancer** | Global External HTTP(S) Load Balancer | Elastic Load Balancing – Application Load Balancer (ALB) | Azure Application Gateway      | [CCC.LoadBal](/catalogs/networking/loadbalancer/) |
| **Internal Load Balancer** | Internal TCP/UDP Load Balancer        | Elastic Load Balancing – Network Load Balancer (NLB)     | Azure Load Balancer (Internal) | [CCC.LoadBal](/catalogs/networking/loadbalancer/) |
| **Virtual Network**        | Virtual Private Cloud (VPC)           | Virtual Private Cloud (VPC)                              | Azure Virtual Network (VNet)   | [CCC.VPC](/catalogs/networking/vpc/)              |
| **Private Networking**     | VPC, Private Service Connect          | VPC, PrivateLink                                         | VNet, Private Endpoint         | [CCC.VPC](/catalogs/networking/vpc/)              |

---

## 🔐 Security and IAM

| **Component**           | **Google Cloud**                     | **Amazon Web Services (AWS)**            | **Microsoft Azure**                         | **CCC Catalog**                          |
| ----------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| **Identity and Access** | Identity and Access Management (IAM) | AWS Identity and Access Management (IAM) | Azure Active Directory + Managed Identities | [CCC.IAM](/catalogs/identity/iam/)       |
| **Encryption**          | Key Management Service               | AWS KMS                                  | Azure Key Vault                             | [CCC.KeyMgmt](/catalogs/crypto/key/)     |
| **Secrets Management**  | Secret Manager                       | Secrets Manager                          | Key Vault                                   | [CCC.SecMgmt](/catalogs/crypto/secrets/) |
| **Firewall Rules**      | VPC Firewall Rules                   | Security Groups and Network ACLs         | Azure Network Security Groups (NSGs)        | [CCC.VPC](/catalogs/networking/vpc/)     |

---

## 📊 Monitoring and Observability

| **Component**     | **Google Cloud**        | **Amazon Web Services (AWS)** | **Microsoft Azure**                | **CCC Catalog**                                    |
| ----------------- | ----------------------- | ----------------------------- | ---------------------------------- | -------------------------------------------------- |
| **Monitoring**    | Cloud Monitoring        | Amazon CloudWatch             | Azure Monitor                      | [CCC.Monitoring](/catalogs/management/monitoring/) |
| **Logging**       | Cloud Logging           | Amazon CloudWatch Logs        | Azure Monitor Logs (Log Analytics) | [CCC.Logging](/catalogs/management/logging/)       |
| **Audit Logging** | Google Cloud Audit Logs | AWS CloudTrail                | Azure Activity Logs                | [CCC.AuditLog](/catalogs/management/auditlog/)     |
| **Tracing**       | Cloud Trace             | X-Ray                         | Application Insights               | [CCC.Tracing](/catalogs/management/tracing)        |

---

## 🗄️ Storage Services

| **Component**      | **Google Cloud** | **Amazon Web Services (AWS)**             | **Microsoft Azure** | **CCC Catalog**                          |
| ------------------ | ---------------- | ----------------------------------------- | ------------------- | ---------------------------------------- |
| **Object Storage** | Cloud Storage    | Amazon Simple Storage Service (Amazon S3) | Azure Blob Storage  | [CCC.ObjStor](/catalogs/storage/object/) |

---

## 🔄 Data Pipeline Services

| **Component**              | **Google Cloud**          | **Amazon Web Services (AWS)** | **Microsoft Azure**             | **CCC Catalog**                                  |
| -------------------------- | ------------------------- | ----------------------------- | ------------------------------- | ------------------------------------------------ |
| **ETL/Data Processing**    | Dataflow                  | Glue, Lambda                  | Azure Data Factory              | Data Processing (Service not yet defined)        |
| **Workflow Orchestration** | Cloud Composer (Airflow)  | Step Functions                | Durable Functions, Logic Apps   | Workflow Orchestration (Service not yet defined) |
| **Chunking & Indexing**    | Cloud Composer w/ Airflow | Glue jobs                     | Data Factory Mapping Data Flows | Data Processing (Service not yet defined)        |

---

## 🧱 Application Tiers

| **Application Tier**    | **Google Cloud**                      | **Amazon Web Services (AWS)**                 | **Microsoft Azure**                                   | **CCC Catalog**                               |
| ----------------------- | ------------------------------------- | --------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| **Web Tier**            | Compute Engine Managed Instance Group | Amazon EC2 Auto Scaling with Launch Templates | Azure Virtual Machine Scale Sets                      | [CCC.VM](/catalogs/compute/virtual-machines/) |
| **Application Tier**    | Compute Engine Managed Instance Group | Amazon EC2 Auto Scaling with Launch Templates | Azure Virtual Machine Scale Sets                      | [CCC.VM](/catalogs/compute/virtual-machines/) |
| **Database Tier (SQL)** | Cloud SQL for PostgreSQL / MySQL      | Amazon RDS for PostgreSQL / MySQL             | Azure Database for PostgreSQL / MySQL Flexible Server | [CCC.RDMS](/catalogs/database/relational/)    |
