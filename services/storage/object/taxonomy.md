# Object Storage Taxonomy

This _service-level taxonomy_ documents the minimual set of features
that should be present for a service to be considered portable for
use in financial services ecosystems.

## Taxonomy

| Taxonomy ID | Feature | Description |
| ----------- | ------- | ----------- |
| CCC-020101 | Buckets | Concept of having uniquely identifiable containers or buckets to store objects. |
| CCC-020102 | Scalability - Capacity Limit | Ability to store unlimited number of objects under a given maximum total capacity. |
| CCC-020103 | Scalability - Object Size Limit | Ability to store large objects under a given maximum object size. |
| CCC-020104 | Durability | High durability for stored objects through redundancy and replication. |
| CCC-020105 | Availability | High availability for stored objects through replication over multiple availability zones within a region. |
| CCC-020106 | Performance - Transaction Rate Limits | High throughput and low latency for read/write operations under a given maximum transaction rate limits.  |
| CCC-020107 | Performance - Querying | Ability to perform simple select queries to retrieve only a subset of objects from the object store. |
| CCC-020108 | Storage Classes | Having different storage classes for frequently and infrequently accessed objects. |
| CCC-020109 | Lifecycle Policies | Ability to define policies to automate data management tasks. |
| CCC-020110 | Versioning | Ability to keep multiple versions of an object in the same object store (bucket). |
| CCC-020111 | Metadata | Support storing, accessing, and managing of object metadata for stored objects. |
| CCC-020112 | Compliance and Governance | Ability to create locks on objects disabling modification or/and deletion of an object for a given period of time. |
| CCC-020113 | Event Notifications | Publish object level events for creation, deletion and modification of objects allowing users to trigger actions in response. |
| CCC-020114 | Encryption at Rest | Objects are encrypted when storing using encryption keys. |
| CCC-020115 | Encryption in Transit | Objects are encrypted in transit, using SSL/TSL. |
| CCC-020116 | Role Based Access Control | Ability to limit the users/roles who can access the object store. |
| CCC-020117 | Object Based Access Control | Ability to control access to specific objects on the store. |
| CCC-020118 | Logging | Ability log access allowing the users to track requests made to the object store. |
