# Compute Services

Compute services in the context of cloud computing refer to the resources and capabilities provided by cloud service providers to run and manage applications, workloads, and virtualized computing environments in a scalable, flexible, and cost-effective manner. These services enable users to provision, configure, and manage virtual servers, containers, serverless functions, and other computing resources without the need for physical hardware procurement or management. 

## Types of Compute Services

[Virtual Machines](#virtual-machines-vms)
[Containers](#containers)
[Serverless Computing](#serverless-computing)
[Batch Processing](#batch-processing)
[Edge Computing](#edge-computing)

### Virtual Machines (VMs)

Virtual machines are virtualized instances of computer hardware that emulate physical servers and run operating systems and applications. Users can provision VMs with custom configurations, including CPU, memory, storage, and networking resources. Cloud providers offer managed VM services with features such as automated provisioning, scaling, monitoring, and pay-as-you-go pricing.

Examples:

- **AWS**: Amazon Elastic Compute Cloud (EC2)
- **Azure**: Virtual Machines 
- **Google Cloud**: Compute Engine

Read more about [Virtual Machines](compute/virtual-machines/taxonomy.md)

### Containers

Containers are lightweight, portable, and isolated environments that package applications and their dependencies for deployment across different computing environments. Container services provide orchestration, management, and scaling capabilities for containerized workloads using platforms such as Docker and Kubernetes. Cloud providers offer managed container services with features such as container registry, cluster management, and auto-scaling.

- **AWS**: Elastic Container Service (ECS) & Elastic Kubernetes Service (EKS)
- **Azure**: Azure Kubernetes Service (AKS)
- **Google Cloud**: Google Kubernetes Engine (GKE)

### Serverless Computing

Serverless computing, also known as Function as a Service (FaaS), allows users to deploy and run code functions without provisioning or managing servers. Cloud providers abstract infrastructure management tasks, such as server provisioning, scaling, and maintenance, enabling users to focus on writing and deploying code. Serverless services automatically scale based on demand and bill users only for the resources consumed during function execution.

Examples:

- **AWS**: AWS Lambda
- **Azure**: Azure Functions
- **Google Cloud**: Cloud Functions

### Batch Processing

Batch processing services enable users to execute large-scale, parallelizable computing tasks, such as data processing, analytics, and batch jobs. These services automatically allocate and manage compute resources to execute batch jobs efficiently and cost-effectively. Users can specify job requirements, dependencies, and scheduling preferences to optimize job execution. 

Examples:

- **AWS**: AWS Batch
- **Azure**: Azure Batch
- **Google Cloud**: Cloud Dataflow

### Edge Computing

Edge computing services extend cloud computing capabilities to the network edge, closer to end-users and devices, to reduce latency, improve performance, and enable real-time data processing and analytics. Edge computing services provide compute, storage, and networking resources at edge locations, such as IoT devices, edge servers, and network appliances.

Examples:

- **AWS**: AWS IoT Greengrass and AWS Outposts
- **Azure**: Azure IoT Edge
- **Google Cloud**: Google Cloud IoT Edge