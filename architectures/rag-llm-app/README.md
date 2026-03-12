# 🤖 RAG-LLM Application Architecture: Cross-Cloud Service Mapping

This document maps the services used in a Retrieval-Augmented Generation (RAG) Large Language Model (LLM) application architecture, providing equivalents for Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP), and the CCC Service Family model.

---

## 📡 Interaction & Gateway Tiers

| **Component** | **Google Cloud**                  | **Amazon Web Services (AWS)** | **Microsoft Azure**                    | **CCC Service**                               |
| -------------------- | --------------------------------- | ----------------------------- | -------------------------------------- | --------------------------------------------- |
| **API Management**     | API Gateway       | Amazon API Gateway      | Azure API Management         | API Gateway (Service not yet defined) |
| **Load Balancing**     | Cloud Load Balancing       | Elastic Load Balancing      | Azure App Gateway        | [CCC.LB](/catalogs/networking/loadbalancer/) |

---

## 🖥️ Logic & Orchestration Tier

| **Component** | **Google Cloud**                  | **Amazon Web Services (AWS)** | **Microsoft Azure**                    | **CCC Service**                               |
| -------------------- | --------------------------------- | ----------------------------- | -------------------------------------- | --------------------------------------------- |
| **Compute**   | Google Compute Engine (GCE)   | Elastic Compute Cloud (EC2)   | Azure Virtual Machines  | [CCC.VM](/catalogs/compute/virtual-machines/) |
| **Serverless Compute**   | Cloud Functions    | AWS Lambda     | Azure Functions     | [CCC.SvlsComp](/catalogs/compute/serverless-computing/) |
| **Container Orchestration**     | GKE       | Amazon Elastic Kubernetes Service (EKS) | Azure Kubernetes Service (AKS) | [CCC.K8S](/catalogs/orchestration/k8s/) |
| **Agentic AI**     | Vertex AI | Amazon Bedrock |  Azure OpenAI | [CCC.GenAI](/catalogs/ai-ml/gen-ai/) |
| **Prompt Management**     | Vertex AI Prompt Management | Amazon Bedrock Prompt Management |  Azure AI Foundry | [CCC.GenAI](/catalogs/ai-ml/gen-ai/) |
| **Embedding Generation**  | Vertex AI Text Embeddings | Bedrock  | Azure OpenAI , Azure AI Studio | [CCC.GenAI](/catalogs/ai-ml/gen-ai/)     |

---

## 📥 Ingestion Tier (Data Pipelines)

| **Component**              | **Google Cloud**          | **Amazon Web Services (AWS)** | **Microsoft Azure**             | **CCC Service**                                  |
| -------------------------- | ------------------------- | ----------------------------- | ------------------------------- | ------------------------------------------------ |
| **ETL/Data Processing**    | Dataflow                  | AWS Glue                    | Azure Data Factory              | [CCC.ETL](/catalogs/orchestration/etl/)        |
| **Workflow Orchestration** | Cloud Composer (Airflow)  | Step Functions              | Azure Data Factory, Logic Apps  | Workflow Orchestration (Service not yet defined) |
| **Message Routing**        | Cloud Pub/Sub             | Amazon SQS                  | Azure Service Bus Messaging | [CCC.Messaging](/catalogs/app-integration/message/)       |
| **Event Routing**          | Eventarc                  | EventBridge                 | Event Grid                  | Event Bus (Service not yet defined)           |

---

## 🗄️ Persistence Tier

| **Component**              | **Google Cloud**          | **Amazon Web Services (AWS)** | **Microsoft Azure**             | **CCC Service**                          |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| **Vector Database**        | Vertex AI Vector Search     | Amazon OpenSearch Serverless   | Azure AI Search (vector)        | [CCC.Vector](/catalogs/database/vector/) |
| **Structured Data**        | Cloud SQL                   | Amazon RDS                     | Azure SQL Database              | [CCC.RDBMS](/catalogs/database/relational/) |
| **Semi Structured Data**   | Cloud Bigtable              | AWS DynamoDB                   | Azure Cosmos DB                 | NoSQL (Service not yet defined) |
| **Unstructured Data**      | Google Cloud Storage        | Amazon S3                      | Azure Blob Storage        | [CCC.ObjStor](/catalogs/storage/object/) |

---


## 🔐 Inference & Safety Tier

| **Component**           | **Google Cloud**                     | **Amazon Web Services (AWS)**            | **Microsoft Azure**                         | **CCC Service**                      |
| ----------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------- | ------------------------------------ |
| **Foundation Models** | Gemini 1.5 Pro / Flash                 | Claude 3.5 / Nova             | GPT-4o / o1                   | [CCC.GenAI](/catalogs/ai-ml/gen-ai/) |
| **Safety Guardrails** | Vertex AI Safety Filters               | Bedrock Guardrails            | Azure AI Content Safety       | [CCC.GenAI](/catalogs/ai-ml/gen-ai/)  |
| **Model Evaluation**  | Vertex AI Evaluation                   | Bedrock Model Evaluation      | Azure AI Foundry Eval         | [CCC.GenAI](/catalogs/ai-ml/gen-ai/) |

---

## 🛡️ Security

| **Component**              | **Google Cloud**             | **Amazon Web Services (AWS)**        | **Microsoft Azure**            | **CCC Service**                                   |
| -------------------------- | ------------------------------------- | -------------------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| **Identity and Access** | Identity and Access Management (IAM) | AWS Identity and Access Management (IAM) | Azure Active Directory + Managed Identities | [CCC.IAM](/catalogs/identity/iam/)   |
| **Encryption**          | Key Management Service               | AWS KMS                                  | Azure Key Vault                             | [CCC.KeyMgmt](/catalogs/crypto/key/) |
| **Secrets Management**  | Secret Manager                       | Secrets Manager                          | Key Vault                                   | [CCC.SecMgmt](/catalogs/crypto/secrets/) |
---

## 🌐 Networking

| **Component**              | **Google Cloud**             | **Amazon Web Services (AWS)**        | **Microsoft Azure**            | **CCC Service**                                   |
| -------------------------- | ------------------------------------- | -------------------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| **Virtual Network**        | Virtual Private Cloud (VPC)  | Virtual Private Cloud (VPC)          | Azure Virtual Network (VNet)   | [CCC.VPC](/catalogs/networking/vpc/)        |
| **Private Networking**     | Private Service Connect      | PrivateLink                          | VNet, Private Endpoint         | Private Connect (Service not yet implemented) |

---

## 📊 Monitoring and Observability

| **Component**     | **Google Cloud**        | **Amazon Web Services (AWS)** | **Microsoft Azure**                | **CCC Service**                                    |
| ----------------- | ----------------------- | ----------------------------- | ---------------------------------- | -------------------------------------------------- |
| **Monitoring**    | Cloud Monitoring        | Amazon CloudWatch             | Azure Monitor                      | [CCC.Monitoring](/catalogs/management/monitoring/) |
| **Logging**       | Cloud Logging           | Amazon CloudWatch Logs        | Azure Monitor Logs (Log Analytics) | [CCC.Logging](/catalogs/management/logging/)       |
| **Audit Logging** | Google Cloud Audit Logs | AWS CloudTrail                | Azure Activity Logs                | [CCC.AuditLog](/catalogs/management/auditlog/)     |
| **Tracing**       | Cloud Trace             | X-Ray                         | Application Insights               | [CCC.Tracing](/catalogs/management/tracing/)  |
| **Cost Analysis** | Cloud Billing           | Cost Explorer                 | Cost Management                    | Management & Governance (Service not yet defined)  |
