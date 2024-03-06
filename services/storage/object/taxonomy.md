# Object Storage Taxonomy

This _service-level taxonomy_ documents the minimual set of features
that should be present for a service to be considered portable for
use in financial services ecosystems.

## Taxonomy

| Taxonomy ID | Feature | Description |
| ----------- | ------- | ----------- |
| CCC-020101 | Buckets | Concept of having uniquely identifiable containers in which objects exist. |
| CCC-020102 | Metadata | Support storing, accessing, and managing of object metadata for stored objects. |
| CCC-020103 | Scalability - Capacity Limit | Ability to store unlimited number of objects under a given maximum total capacity per bucket. |
| CCC-020104 | Scalability - Object Size Limit | Ability to store large objects under a given maximum object size. |
| CCC-020105 | Durability | High durability for stored objects through redundancy and replication. |
| CCC-020106 | Availability | High availability for stored objects through replication over multiple (availability) zones within a region. |
| CCC-020107 | Performance - Transaction Rate Limits | High throughput and low latency for read/write operations under given maximum transaction rate limits.  |
| CCC-020108 | Performance - Querying | Ability to perform simple select queries to retrieve only a subset of objects from the bucket. |
| CCC-020109 | Storage Classes | Having different storage classes for frequently and infrequently accessed objects. |
| CCC-020110 | Lifecycle Policies | Ability to define policies to automate data management tasks. |
| CCC-020111 | Versioning | Ability to keep multiple versions of an object in the same bucket. |
| CCC-020112 | Compliance and Governance | Ability to create locks on objects disabling modification and/or deletion of an object for a given period of time. |
| CCC-020113 | Event Notifications | Publish object level events for creation, deletion and modification of objects allowing users to trigger actions in response. |
| CCC-020114 | Encryption at Rest | Data should be encrypted before storing by default. Should also make the option available for clients to maintain control over the encryptin keys. |
| CCC-020115 | Encryption in Transit | Ability to encrypt data in transit using SSL/TSL. |
| CCC-020116 | Identity Based Access Control | Ability to limit the users/roles who can access the object store. |
| CCC-020117 | Object Level Access Control | Ability to control access to specific objects on the object store. |
| CCC-020118 | Logging | Ability to log access, allowing the clients to track requests made to the object store. |
| CCC-020119 | Signed URLs | Ability to give temporary access to objects and buckets through a signed URL or signed access token. |
