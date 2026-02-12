# 🤖 RAG-LLM Application Architecture: Cross-Cloud Service Mapping

This document maps the services used in a Retrieval-Augmented Generation (RAG) Large Language Model (LLM) application architecture, providing equivalents for Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP), and the CCC Service Family model.

---

## 🏗️ Application Tiers

| **Application Tier** | **Google Cloud**                  | **Amazon Web Services (AWS)** | **Microsoft Azure**                    | **CCC Service**                               |
| -------------------- | --------------------------------- | ----------------------------- | -------------------------------------- | --------------------------------------------- |
| **API Tier**         | Cloud Run / Cloud Functions       | Lambda, ECS/Fargate, EKS      | Functions, Container Apps, AKS         | [CCC.VM](/catalogs/compute/virtual-machines/) |
| **Compute Tier**     | Vertex AI, Cloud Run              | EC2 GPU, SageMaker            | NC-series VMs, Azure AI Studio         | [CCC.VM](/catalogs/compute/virtual-machines/) |
| **Data Tier**        | Cloud SQL, AlloyDB, Cloud Storage | Aurora, RDS, S3               | Azure SQL, Postgres flex, Blob Storage | [CCC.RDMS](/catalogs/database/relational/)    |

---

## 🧠 AI/ML Services

| **Component**                 | **Google Cloud**                            | **Amazon Web Services (AWS)**                           | **Microsoft Azure**                              | **CCC Service**                          |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| **Vector Database**           | Vertex AI Search, AlloyDB w/ pgvector       | Amazon OpenSearch Serverless w/ k-NN, Neptune Analytics | Azure AI Search (vector), Cosmos DB w/ index     | [CCC.Vector](/catalogs/database/vector/) |
| **Embedding Generation**      | Vertex AI Text Embeddings, OpenAI endpoints | Bedrock (text-embedding-3)                              | Azure OpenAI "text-embedding-3", Azure AI Studio | [CCC.GenAI](/catalogs/ai-ml/gen-ai/)     |
| **Generative Model Endpoint** | Vertex AI Gemma, GPT-4o                     | Bedrock (Claude, GPT-4o, Mistral)                       | Azure OpenAI GPT-4o/4-Turbo                      | [CCC.GenAI](/catalogs/ai-ml/gen-ai/)     |
| **Model Evaluation**          | Vertex AI Evaluations                       | Bedrock Model Evaluation, SageMaker Clarify             | Azure AI Content Safety + Prompt Flow eval       | [CCC.MLDE](/catalogs/ai-ml/mlde/)        |

---

## 🌐 Networking and Load Balancing

| **Component**              | **Google Cloud**                      | **Amazon Web Services (AWS)**                            | **Microsoft Azure**            | **CCC Service**                                   |
| -------------------------- | ------------------------------------- | -------------------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| **External Load Balancer** | Global External HTTP(S) Load Balancer | Elastic Load Balancing – Application Load Balancer (ALB) | Azure Application Gateway      | [CCC.LoadBal](/catalogs/networking/loadbalancer/) |
| **Internal Load Balancer** | Internal TCP/UDP Load Balancer        | Elastic Load Balancing – Network Load Balancer (NLB)     | Azure Load Balancer (Internal) | [CCC.LoadBal](/catalogs/networking/loadbalancer/) |
| **Virtual Network**        | Virtual Private Cloud (VPC)           | Virtual Private Cloud (VPC)                              | Azure Virtual Network (VNet)   | [CCC.VPC](/catalogs/networking/vpc/)              |
| **Private Networking**     | VPC, Private Service Connect          | VPC, PrivateLink                                         | VNet, Private Endpoint         | [CCC.VPC](/catalogs/networking/vpc/)              |

---

## 🔐 Security and IAM

| **Component**           | **Google Cloud**                     | **Amazon Web Services (AWS)**            | **Microsoft Azure**                         | **CCC Service**                      |
| ----------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------- | ------------------------------------ |
| **Identity and Access** | Identity and Access Management (IAM) | AWS Identity and Access Management (IAM) | Azure Active Directory + Managed Identities | [CCC.IAM](/catalogs/identity/iam/)   |
| **Encryption**          | Key Management Service               | AWS KMS                                  | Azure Key Vault                             | [CCC.KeyMgmt](/catalogs/crypto/key/) |
| **Secrets Management**  | Secret Manager                       | Secrets Manager                          | Key Vault                                   | [CCC.KeyMgmt](/catalogs/crypto/key/) |
| **Firewall Rules**      | VPC Firewall Rules                   | Security Groups and Network ACLs         | Azure Network Security Groups (NSGs)        | [CCC.VPC](/catalogs/networking/vpc/) |

---

## 📊 Monitoring and Observability

| **Component**     | **Google Cloud**        | **Amazon Web Services (AWS)** | **Microsoft Azure**                | **CCC Service**                                    |
| ----------------- | ----------------------- | ----------------------------- | ---------------------------------- | -------------------------------------------------- |
| **Monitoring**    | Cloud Monitoring        | Amazon CloudWatch             | Azure Monitor                      | [CCC.Monitoring](/catalogs/management/monitoring/) |
| **Logging**       | Cloud Logging           | Amazon CloudWatch Logs        | Azure Monitor Logs (Log Analytics) | [CCC.Logging](/catalogs/management/logging/)       |
| **Audit Logging** | Google Cloud Audit Logs | AWS CloudTrail                | Azure Activity Logs                | [CCC.AuditLog](/catalogs/management/auditlog/)     |
| **Tracing**       | Cloud Trace             | X-Ray                         | Application Insights               | Management & Governance (Service not yet defined)  |
| **Cost Analysis** | Cloud Billing           | Cost Explorer                 | Cost Management                    | Management & Governance (Service not yet defined)  |

---

## 🗄️ Storage Services

| **Component**      | **Google Cloud** | **Amazon Web Services (AWS)**             | **Microsoft Azure** | **CCC Service Family**                   |
| ------------------ | ---------------- | ----------------------------------------- | ------------------- | ---------------------------------------- |
| **Object Storage** | Cloud Storage    | Amazon Simple Storage Service (Amazon S3) | Azure Blob Storage  | [CCC.ObjStor](/catalogs/storage/object/) |

---

## 🔄 Data Pipeline Services

| **Component**              | **Google Cloud**          | **Amazon Web Services (AWS)** | **Microsoft Azure**             | **CCC Service**                                  |
| -------------------------- | ------------------------- | ----------------------------- | ------------------------------- | ------------------------------------------------ |
| **ETL/Data Processing**    | Dataflow                  | Glue                          | Azure Data Factory              | [CCC.ETL](/catalogs/orchestration/etl/)        |
| **Workflow Orchestration** | Cloud Composer (Airflow)  | Step Functions                | Durable Functions, Logic Apps   | Workflow Orchestration (Service not yet defined) |
| **Chunking & Indexing**    | Cloud Composer w/ Airflow | Glue jobs                     | Data Factory Mapping Data Flows | Data Processing (Service not yet defined)        |

---

## 🤖 Agentic AI Services

| **Component**                 | **Google Cloud**           | **Amazon Web Services (AWS)** | **Microsoft Azure** | **CCC Service**                                   |
| ----------------------------- | -------------------------- | ----------------------------- | ------------------- | ------------------------------------------------- |
| **Multi-Agent Orchestration** | LangGraph, Semantic Kernel | LangGraph, Semantic Kernel    | Semantic Kernel     | [CCC.GenAI](/catalogs/ai-ml/gen-ai/)              |
| **API Governance**            | Apigee                     | API Gateway                   | API Management      | [CCC.Message](/catalogs/app-integration/message/) |
