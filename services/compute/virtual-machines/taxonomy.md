# Virtual Machines Taxonomy

This _service-level taxonomy_ documents the minimal set of features
that should be present for a service to be considered portable for
use in financial services ecosystems.

## Taxonomy

| Taxonomy ID | Feature | Description |
| ----------- | ------- | ----------- |
|	CCC-030101	|	Instance Types	|	Offers a range of instance types with different specifications for CPU, GPU, memory, storage optimisation and networking capacity.	|
|	CCC-030102	|	Operating System Options 	|	A selection of operating systems for virtual machine instances.	|
|	CCC-030103	|	Ephemeral Storage	|	Temporary storage available to the VM which is lost when the instance is stopped or terminated	|
|	CCC-030104	|	Availability	|	Ensuring high availability of virtual machine instances through redundancy and multiple (availability) zones within a region.	|
|	CCC-030105	|	Identity and Access Management	|	Implementing identity and access management features such as key pairs, JIT and MFA to control user access to virtual machine instances.	|
|	CCC-030106	|	Monitoring and Logging	|	Offering monitoring and logging capabilities to track performance metrics, user access and security events.	|
|	CCC-030107	|	Backup and Restore	|	Providing backup and disaster recovery solutions for virtual machine instances and associated data, including snapshot-based backups, incremental backups, and point-in-time recovery.	|
|	CCC-030108	|	Encryption at Rest	|	Encrypting data stored by virtual machine instances to protect against unauthorized access.	|
|	CCC-030109	|	Encryption in Transit	|	Encrypting data transmitted to and from virtual machine instances to protect against interception.	|
|	CCC-030110	|	Patch Management	|	Offering patch management services and compatibility with third party patch management tools to keep virtual machine instances up to date with security patches and updates.	|
|	CCC-030111	|	Isolated Secure Environments	|	Providing an isolated "enclave" within a virtual machine for processing encrypted and/or sensitive data, with support for custom key management infrastructure.	|
|	CCC-030112	|	Nested Virtualization	|	Allowing the creation of virtual machines within virtual machines.	|
|	CCC-030113	|	Container Support	|	Offering support for running containers within virtual machine instances for containerized applications.	|
|	CCC-030114	|	Instance Metadata	|	Providing metadata about virtual machine instances for configuration and management purposes.	|
|	CCC-030115	|	Instance Lifecycle Events	|	Offering features for managing the lifecycle and state of virtual machine instances, including starting, stopping, pausing, and restarting instances as needed.	|
|	CCC-030116	|	Instance Snapshots	|	Creation of snapshots of virtual machine instances to capture and preserve state and data for backup and cloning purposes. 	|
|	CCC-030117	|	Instance Templates	|	Offering templates for provisioning virtual machine instances with pre-configured images, predefined configurations and settings and/or bootstrap scripts.	|
|	CCC-030118	|	Instance Preemptibility	|	Providing the option for using preemptible virtual machine (spot) instances at a lower cost for non-critical or fault-tolerant workloads that may be terminated by the cloud provider after a notice period.	|
|	CCC-030119	|	Instance Affinity/Anti-affinity	|	Enabling control over the location of virtual machine instances to ensure or prevent co-location on the same physical hardware.	|
|	CCC-030120	|	Instance Health Checks	|	Providing features for performing health checks on virtual machine instances and automatically replacing or repairing unhealthy instances.	|
|	CCC-030121	|	Instance Remote Access	|	Offering remote access to virtual machine instances through methods such as SSH or RDP for troubleshooting, debugging, and maintenance purposes.	|
|	CCC-030122	|	Instance Live Migration	|	The ability to perform live migration of virtual machine instances between physical hosts for maintenance or load balancing purposes without downtime.	|
|	CCC-030123	|	Instance Remote Configuration	|	Providing tools for remotely configuring virtual machine instances, including deployment automation and configuration management frameworks.	|
|	CCC-030124	|	Instance Resource Tagging	|	Enabling tagging of virtual machine instances with metadata for organization, management, and cost allocation purposes.	|
|	CCC-030125	|	Instance Resource Monitoring	|	Providing tools for monitoring resource utilization and performance metrics for virtual machine instances, including CPU usage, memory usage, disk I/O, and network traffic.	|
|	CCC-030126	|	Custom Images	|	Allows users to create and manage their own customized virtual machine images.	|
|	CCC-030127	|	Dynamic Performance	|	Providing "burstable" instances for intermittent workloads that accumulate credits during periods of low usage which can be used to burst above baseline performance when needed.	|
|	CCC-030128	|	Dedicated Instances	|	Providing the option to run instances on physical servers that are dedicated solely to a single customer account, ensuring that the underlying hardware resources are not shared with other customers.	|
|	CCC-030129	|	Instance Scheduling	|	Offering features for scheduling the startup, shutdown, and maintenance of virtual machine instances based on predefined schedules or conditions.	|
|	CCC-030130	|	Interoperability with Storage Options	|	Capability to read/write to non-ephemeral external storage including object storage and encrypted block storage.	|
|	CCC-030131	|	Instance Autoscaling	|	Automatically adjusting the number and instance type of virtual machine instances based on predefined criteria such as CPU utilization or incoming traffic,	|
|	CCC-030132	|	Instance Grouping	|	Offering logical grouping and management tools for sets of virtual machine instances.	|
|	CCC-030133	|	Scalability - Horizontal	|	Ability to scale virtual machine instances horizontally by adding more instances to accommodate increased workload demands	|
|	CCC-030134	|	Scalability - Vertical	|	Ability to scale virtual machine instances vertically by adjusting CPU, memory, and storage resources.	|
|	CCC-030135	|	Security Groups	|	Ability to configure security groups or firewalls to control inbound and outbound traffic to and from instances.	|
|	CCC-030136	|	Interoperability with Networking Options	|	Offering networking options such as virtual private networks (VPNs), direct connections, and interconnects for connecting virtual machine instances to on-premises networks or other cloud services.	|
|	CCC-030137	|	TPM Support	|	Providing support for Trusted Platform Module (TPM) for hardware-based security features such as secure boot and cryptographic key storage.	|
