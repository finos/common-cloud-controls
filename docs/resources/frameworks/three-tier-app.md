# 🌐 3-Tier Application Architecture: Cross-Cloud Service Mapping

This document maps the services used in a standard 3-tier application architecture as defined in [Google Cloud’s single-zone Compute Engine reference architecture](https://cloud.google.com/architecture/single-zone-deployment-compute-engine), and provides equivalents for Amazon Web Services (AWS), Microsoft Azure, and the CCC Service Family model.

---

## 🧱 Application Tiers

| **Application Tier**    | **Google Cloud**                      | **Amazon Web Services (AWS)**                 | **Microsoft Azure**                                   | **CCC Service**                        |
| ----------------------- | ------------------------------------- | --------------------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| **Web Tier**            | Compute Engine Managed Instance Group | Amazon EC2 Auto Scaling with Launch Templates | Azure Virtual Machine Scale Sets                      | Virtual Machines (VMs)                 |
| **Application Tier**    | Compute Engine Managed Instance Group | Amazon EC2 Auto Scaling with Launch Templates | Azure Virtual Machine Scale Sets                      | Virtual Machines (VMs)                 |
| **Database Tier (SQL)** | Cloud SQL for PostgreSQL / MySQL      | Amazon RDS for PostgreSQL / MySQL             | Azure Database for PostgreSQL / MySQL Flexible Server | Relational Database Management Systems |

---

## 🌐 Networking and Load Balancing

| **Component**              | **Google Cloud**                      | **Amazon Web Services (AWS)**                            | **Microsoft Azure**            | **CCC Service**             |
| -------------------------- | ------------------------------------- | -------------------------------------------------------- | ------------------------------ | --------------------------- |
| **External Load Balancer** | Global External HTTP(S) Load Balancer | Elastic Load Balancing – Application Load Balancer (ALB) | Azure Application Gateway      | Load Balancing              |
| **Internal Load Balancer** | Internal TCP/UDP Load Balancer        | Elastic Load Balancing – Network Load Balancer (NLB)     | Azure Load Balancer (Internal) | Load Balancing              |
| **Virtual Network**        | Virtual Private Cloud (VPC)           | Virtual Private Cloud (VPC)                              | Azure Virtual Network (VNet)   | Virtual Private Cloud (VPC) |

---

## 🔐 Security and IAM

| **Component**           | **Google Cloud**                     | **Amazon Web Services (AWS)**            | **Microsoft Azure**                         | **CCC Service**                |
| ----------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------- | ------------------------------ |
| **Identity and Access** | Identity and Access Management (IAM) | AWS Identity and Access Management (IAM) | Azure Active Directory + Managed Identities | Identity and Access Management |
| **Encryption**          | Key Management Service               | AWS KMS                                  | Azure Key Vault                             | Key Management                 |
| **Firewall Rules**      | VPC Firewall Rules                   | Security Groups and Network ACLs         | Azure Network Security Groups (NSGs)        | Virtual Private Cloud          |
| **Audit Logging**       | Cloud Logging                        | AWS CloudTrail                           | Azure Activity Logs                         | TBC                            |

---

## 📊 Monitoring and Logging

| **Component**  | **Google Cloud** | **Amazon Web Services (AWS)** | **Microsoft Azure**                | **CCC Service**         |
| -------------- | ---------------- | ----------------------------- | ---------------------------------- | ----------------------- |
| **Monitoring** | Cloud Monitoring | Amazon CloudWatch             | Azure Monitor                      | Management & Governance |
| **Logging**    | Cloud Logging    | Amazon CloudWatch Logs        | Azure Monitor Logs (Log Analytics) | Management & Governance |

---

## 🗄️ Storage Services

| **Component**      | **Google Cloud** | **Amazon Web Services (AWS)**             | **Microsoft Azure** | **CCC Service Family** |
| ------------------ | ---------------- | ----------------------------------------- | ------------------- | ---------------------- |
| **Object Storage** | Cloud Storage    | Amazon Simple Storage Service (Amazon S3) | Azure Blob Storage  | Object Storage         |

---

## 📝 Notes

- **Single-Zone Deployment**: All components are deployed in a single availability zone or equivalent. This is typically suitable for dev/test workloads but not for production environments requiring high availability.
- **Canonical Service Names** are used as defined in CSP documentation and pricing calculators.
