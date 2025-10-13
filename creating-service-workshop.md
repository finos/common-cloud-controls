# June 2025 OSFF Workshop 

_Some notes used to create the vector store example used in the workshop._

&nbsp;

&nbsp;

# Plan of Action

1.  Pick a service.
2.  Create the service family.
   1.  Create the taxonomy entry in the `service-category.yaml` file
   2.  Familiarise yourself with the services available in the cloud providers.
3.  Ask chatGpt to give a list of the main features of the service, handing it the variats from the different CSPs.  Show it
    1.  the object storage bucket features
    2.  and the common features file
    3.  and ask it to write up its features in a similar way (JSON format), keeping common features where they exist
4.  For the brand new features it has listed, ask it to do a threat analysis, listing out any common threats it perceives.
5.  Give it the example threats file from the storage bucket, ask it to produce the same.
6.  Give it the controls.yaml file from the storage bucket, ask for the same for the service you're doing.
7.  Build a PR
8.  Pass the checks

&nbsp;

### Pick a service

> We are working on the FINOS Common Cloud Controls project, building a definition of the vector store service: Managed vector database Store embeddings, similarity search Amazon OpenSearch Serverless w/ k-NN, Neptune Analytics Azure AI Search (vector), Cosmos DB w/ index Vertex AI Search, AlloyDB w/ pgvector. (a generic listing for any of these). Take a look at the attached JSON file describing an object storage bucket and write a similar one for vector stores.

```yaml
metadata:
  id: CCC.VectorStore
  title: Managed Vector Store
  description: |
    A Managed Vector Store is a specialized data service designed to store, index, and retrieve high-dimensional vector embeddings, enabling similarity search and machine learning inference. These services are used in AI/ML pipelines for use cases such as semantic search, recommendation systems, and generative AI applications. Vector stores support operations like nearest neighbor search using approximate or exact methods and integrate with model-serving and ingestion pipelines. They are optimized for performance, scale, and integration with cloud-native tools.
  version: "2025.07"
  last-modified: "2025-06-20T00:00:00Z"
  applicability-categories: []
  mapping-references: []

```

### Ask chatGpt to give a list of the main features of the service, handing it the variats from the different CSPs.

> ok, now we're going to generate the list of capabilities. First, why don't you just generate a bullet-list of the main features that a vector store should have, irrespective of which particular instance it is (some examples were given above)

```
Absolutely — here’s a comprehensive list of core capabilities that a **Managed Vector Store** should have, agnostic of cloud provider or implementation:

---

### ✅ Core Capabilities of a Managed Vector Store

* **Vector Embedding Storage**
  Store high-dimensional vector representations (embeddings) generated from text, images, or other data modalities.

* **Vector Indexing**
  Create and manage indexes (e.g., HNSW, IVF, PQ, ScaNN, etc.) to support efficient similarity search.

* **Similarity Search (k-Nearest Neighbor)**
  Perform approximate or exact nearest-neighbor searches to find vectors most similar to a given query vector.

* **Multi-modal Support**
  Support embeddings derived from various data types (e.g., text, image, audio).

* **Filtering and Metadata Search**
  Combine vector similarity search with structured metadata filtering (e.g., only return results where `type=“document”`).

* **Batch Ingestion and Updates**
  Ingest, update, or delete large volumes of vectors in batch operations.

* **Integration with AI/ML Pipelines**
  Provide APIs or connectors to model-serving, training pipelines, or embedding generators.

* **Index Lifecycle Management**
  Manage the lifecycle of indexes (creation, optimization, rebuilds, deletion) automatically or via API.

* **Real-time or Near Real-time Querying**
  Support low-latency retrieval for production-grade applications (e.g., chatbots, semantic search).

* **Data Partitioning and Sharding**
  Support for horizontal scaling through partitioning and sharding of vector data.

* **Versioning or Time-based Snapshots**
  Allow snapshots or versioning of vector datasets and indexes for rollback or audit purposes.

* **Access Control and Authorization**
  Enforce RBAC, ABAC, or fine-grained access control at the vector or index level.

* **Encryption and Data Protection**
  Encrypt vector data at rest and in transit, optionally support bring-your-own-key (BYOK).

* **Monitoring and Metrics**
  Track performance, query latency, storage size, and resource usage metrics.

* **Audit Logging**
  Maintain logs of queries and data access for compliance and forensic analysis.

* **High Availability and Disaster Recovery**
  Ensure redundancy and backup for production-grade resilience and failover.

* **Compliance and Residency Support**
  Support regulatory requirements such as data locality, GDPR, SOC 2, HIPAA, etc.

---

Let me know if you'd like this converted into YAML format for use under a `capabilities:` section or if you'd prefer it structured in a canonical CCC format.

```

> ok, I'm going to give you the example capabilities.yaml file from object storage, along with the common capabilities file (CCC.CP01-CCC.CP23). You should reference these in the same way as the object storage one does, for the capabilities you think are pertinent for vector stores too. 

&nbsp;

```yaml
shared-capabilities:
  - reference-id: CCC
    identifiers:
      - CCC.CP01 # Encryption in Transit Enabled by Default
      - CCC.CP02 # Encryption at Rest Enabled by Default
      - CCC.CP03 # Access/Activity Logs
      - CCC.CP04 # Transaction Rate Limits
      - CCC.CP06 # Identity Based Access Control
      - CCC.CP08 # Multi-zone Deployment
      - CCC.CP09 # Monitoring
      - CCC.CP10 # Logging
      - CCC.CP11 # Backup
      - CCC.CP12 # Recovery
      - CCC.CP14 # API Access
      - CCC.CP18 # Versioning
      - CCC.CP20 # Tagging
      - CCC.CP21 # Replication
      - CCC.CP22 # Location Lock-In

capabilities:
  - id: CCC.Vector.CP01
    title: Embedding Storage
    description: |
      Supports storage of high-dimensional vector embeddings derived from raw input data such as text, images, or audio.

  - id: CCC.Vector.CP02
    title: Vector Indexing
    description: |
      Provides creation and management of indexes optimized for similarity search, such as HNSW, IVF, or PQ.

  - id: CCC.Vector.CP03
    title: Similarity Search
    description: |
      Enables nearest-neighbor queries using a query embedding to return the most similar vectors from the store.

  - id: CCC.Vector.CP04
    title: Metadata Filtering
    description: |
      Supports structured filtering on metadata fields alongside vector similarity search queries.

  - id: CCC.Vector.CP05
    title: Batch Ingestion
    description: |
      Allows for high-throughput batch upload and deletion of vectors and associated metadata.

  - id: CCC.Vector.CP06
    title: Real-Time Querying
    description: |
      Provides low-latency response to vector similarity queries suitable for interactive applications.

  - id: CCC.Vector.CP07
    title: Index Lifecycle Management
    description: |
      Enables automated or manual creation, optimization, and removal of vector indexes.

  - id: CCC.Vector.CP08
    title: Embedding Format Compatibility
    description: |
      Supports standard vector formats and integrates with common embedding generators (e.g., OpenAI, HuggingFace, TensorFlow).

  - id: CCC.Vector.CP09
    title: Vector Dimension Management
    description: |
      Supports storing and managing vectors of specific or dynamic dimensionality, depending on model needs.

  - id: CCC.Vector.CP10
    title: Multi-modal Vector Support
    description: |
      Supports storing and searching across vectors derived from multiple modalities (e.g., text, image, audio).

  - id: CCC.Vector.CP11
    title: Query Access Control
    description: |
      Provides the ability to restrict who can run vector similarity or metadata filter queries, separate from data modification rights.

  - id: CCC.Vector.CP12
    title: Approximate or Exact Search Modes
    description: |
      Supports both approximate nearest neighbor (ANN) algorithms for speed and exact search modes for precision-critical applications.

```

&nbsp;

### For the brand new features it has listed, ask it to do a threat analysis, listing out any common threats it perceives.

> ok, let's move onto threats. For each of these vector-specific threats (i.e. not the common ones), can you list out the main threats faced by deployers of this technology enabling this capability?

```
Absolutely — let’s walk through **vector store-specific threats** by capability. Below, each capability is followed by a set of **realistic threats** that a deployer of managed vector databases might face. I’ll exclude general cloud threats (e.g. misconfigured IAM, unencrypted data at rest) and focus only on threats **specific to the nature of vector storage, indexing, and querying**.

---

### **CCC.Vector.CP01 – Embedding Storage**

**Threats:**

* **Model inversion attacks:** Adversaries may reverse-engineer stored embeddings to reconstruct input data (e.g. text or images).
* **Sensitive data leakage:** Embeddings may contain PII or confidential semantic signals even if the original data is removed.
* **Improper embedding sanitation:** Ingesting unvalidated or adversarial embeddings could introduce poisoned data into downstream models.

---

### **CCC.Vector.CP02 – Vector Indexing**

**Threats:**

* **Index poisoning:** Attackers could pollute the index with crafted embeddings that bias search results or degrade quality.
* **DoS via index fragmentation:** Repeated updates and deletions can degrade index performance or lead to excessive reindexing.

---

### **CCC.Vector.CP03 – Similarity Search**

**Threats:**

* **Embedding extraction/inference:** High-volume similarity queries can allow attackers to infer what embeddings are stored.
* **Membership inference:** Determining if a particular input was used to train a model or is stored in the vector database.
* **Query amplification attacks:** Using repeated small queries to infer patterns in high-dimensional space (shadow modeling).

---

### **CCC.Vector.CP04 – Metadata Filtering**

**Threats:**

* **Metadata leakage:** Poorly configured access controls may expose sensitive labels, user tags, or classification metadata.
* **Query correlation:** Attackers could combine vector and metadata filters to triangulate private data attributes.

---

### **CCC.Vector.CP05 – Batch Ingestion**

**Threats:**

* **Bulk poisoning:** Attackers could upload massive volumes of low-quality, adversarial, or malicious embeddings.
* **Quota exhaustion:** Flooding the store to hit capacity limits and block ingestion for other users (storage starvation).

---

### **CCC.Vector.CP06 – Real-Time Querying**

**Threats:**

* **Low-latency enumeration:** Real-time APIs can be abused to brute-force similarity matches in near real time.
* **Service degradation:** High-frequency queries degrade latency for legitimate users (query-based DoS).

---

### **CCC.Vector.CP07 – Index Lifecycle Management**

**Threats:**

* **Unauthorized index manipulation:** Improper permissions may allow attackers to delete or rebuild indexes to sabotage accuracy.
* **Rollback abuse:** Malicious actors may restore outdated or poisoned index snapshots if versioning isn’t access-controlled.

---

### **CCC.Vector.CP08 – Embedding Format Compatibility**

**Threats:**

* **Unsupported format injection:** Submitting malformed vectors that evade validation or crash underlying indexing engines.
* **Embedding mismatch:** Using incompatible formats (e.g. cosine vs. dot product) can create silent logical errors exploitable in results.

---

### **CCC.Vector.CP09 – Vector Dimension Management**

**Threats:**

* **Dimensional inconsistency:** Allowing variable dimensions can lead to index corruption or query failure.
* **Overfitting exploits:** Attackers may use high-dimension vectors to overfit and manipulate similarity outcomes.

---

### **CCC.Vector.CP10 – Multi-modal Vector Support**

**Threats:**

* **Cross-modal leakage:** Linking vectors across modalities (e.g., voice and face) could re-identify individuals.
* **Inference via modality correlations:** Attackers could infer input type or category from stored embeddings.

---

### **CCC.Vector.CP11 – Query Access Control**

**Threats:**

* **Excessive read privilege:** Users with query access can extract sensitive embeddings even if they can't modify them.
* **Side-channel leakage:** Differing query latencies or results based on access can leak access control details.

---

### **CCC.Vector.CP12 – Approximate or Exact Search Modes**

**Threats:**

* **Search bias exploitation:** Approximate algorithms may yield non-deterministic results — exploitable for evasion or adversarial outcomes.
* **Precision downgrade attacks:** Attackers may force ANN mode on sensitive queries where exact match is required.

---

Would you like these compiled into a `threats.yaml`-style structure with threat IDs next? Or do you want to start drafting controls that mitigate these threats?

```

&nbsp;

> fantastic. For each of these, I'd like you to cross-reference this resource : https://air-governance-framework.finos.org. and, where there is a matching threat (risk) there, include it in your description above

Here are the **vector store–specific threats**, now cross-referenced with real entries in the FINOS AI Governance Framework where applicable, to help align with existing risk taxonomy (AIR‑SEC‑002, AIR‑SEC‑009, etc.):

* * *

### CCC.Vector.CP01 – Embedding Storage

- \*\*Model inversion attacks\*\*  
    *Adversaries reconstruct textual or visual inputs from stored embeddings.*  
    **Matching FINOS risk:** *Information Leaked to Vector Store (AIR‑SEC‑002)* — embeddings may reveal sensitive data even if not human-readable ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/risks/ri-2_information-leaked-to-vector-store.html?utm_source=chatgpt.com "Information Leaked to Vector Store - FINOS AI Governance Framework")).
    
- \*\*Sensitive data leakage\*\*  
    *Embeddings may inadvertently include PII or confidential semantic signals.*  
    **Matching FINOS risk:** also under *Information Leaked… (AIR‑SEC‑002)* ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/?utm_source=chatgpt.com "FINOS AI Governance Framework")).
    
- \*\*Unvalidated/adversarial embedding ingestion\*\*  
    *Allows poisoning or semantic errors when malicious embeddings are accepted.*  
    **Matching FINOS risk:** *Data Poisoning (AIR‑SEC‑009)* — attackers can tamper with embeddings to degrade LLM outputs ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/risks/ri-8_tampering-with-the-foundational-model.html?utm_source=chatgpt.com "Tampering With the Foundational Model"), [air-governance-framework.finos.org](https://air-governance-framework.finos.org/risks/ri-10_prompt-injection.html?utm_source=chatgpt.com "Prompt Injection - FINOS AI Governance Framework"), [air-governance-framework.finos.org](https://air-governance-framework.finos.org/?utm_source=chatgpt.com "FINOS AI Governance Framework")).
    

* * *

### CCC.Vector.CP02 – Vector Indexing

- **Index poisoning**  
    *Malicious embeddings compromise search quality or introduce bias.*  
    **Matching FINOS risk:** *Data Poisoning (AIR‑SEC‑009)* .
    
- **Index fragmentation / DoS risk**  
    *Frequent index changes degrade performance or force rebalances.*
    

* * *

### CCC.Vector.CP03 – Similarity Search

- \*\*Embedding extraction via brute-force queries\*\*  
    *Attackers infer stored vectors by probing similarity responses.*  
    **Matching FINOS risk:** *Information Leaked to Vector Store (AIR‑SEC‑002)* ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/?utm_source=chatgpt.com "FINOS AI Governance Framework"), [air-governance-framework.finos.org](https://air-governance-framework.finos.org/risks/ri-2_information-leaked-to-vector-store.html?utm_source=chatgpt.com "Information Leaked to Vector Store - FINOS AI Governance Framework")).
    
- **Membership inference**  
    *Determining if a particular input was used or stored.*  
    **Matching FINOS risk:** also under *AIR‑SEC‑002* ([github.com](https://github.com/finos/ai-governance-framework?utm_source=chatgpt.com "finos/ai-governance-framework - GitHub")).
    
- \*\*Query amplification attacks\*\*  
    *Repetitive queries to map embedding space or escape rate limits.*  
    **Matching FINOS risk:** partially aligns with *AIR‑SEC‑002* due to leakage concerns ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/risks/ri-2_information-leaked-to-vector-store.html?utm_source=chatgpt.com "Information Leaked to Vector Store - FINOS AI Governance Framework")).
    

* * *

### CCC.Vector.CP04 – Metadata Filtering

- **Metadata leakage**  
    *Structured filters may inadvertently expose sensitive labels or tags.*  
    **Matching FINOS mitigations:** *Preserving Source Data Access Controls (AIR‑RC‑022)* warns about vector DBs lacking granular ACLs ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/mitigations/mi-16_preserving-source-data-access-controls-in-ai-systems.html?utm_source=chatgpt.com "Preserving Source Data Access Controls in AI Systems")).
    
- **Query correlation attacks**  
    *Combining metadata and vector queries to isolate private records.*
    

* * *

### CCC.Vector.CP05 – Batch Ingestion

- **Bulk poisoning**  
    *Large-scale malicious embedding insertion.*  
    **Matching FINOS risk:** *Data Poisoning (AIR‑SEC‑009)* ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/mitigations/mi-3_user-app-model-firewalling-filtering.html?utm_source=chatgpt.com "User/App/Model Firewalling/Filtering"), [air-governance-framework.finos.org](https://air-governance-framework.finos.org/?utm_source=chatgpt.com "FINOS AI Governance Framework")).
    
- **Storage quota exhaustion**  
    *Flooding with embeddings to prevent legitimate uploads.*
    

* * *

### CCC.Vector.CP06 – Real-Time Querying

- \*\*Low-latency enumeration\*\*  
    *APIs abused to systematically extract embeddings.*  
    **Matching FINOS risk:** *Information Leaked… (AIR‑SEC‑002)* ([air-governance-framework.finos.org](https://air-governance-framework.finos.org/mitigations/mi-16_preserving-source-data-access-controls-in-ai-systems.html?utm_source=chatgpt.com "Preserving Source Data Access Controls in AI Systems")).
    
- **Query-based DoS**  
    *High-frequency querying degrades service quality/performance.*
    

* * *

### CCC.Vector.CP07 – Index Lifecycle Management

- **Unauthorized index manipulation**  
    *Deletion/rebuilding of indexes affecting availability or integrity.*
    
- **Rollback abuse**  
    *Restoring to poisoned or outdated snapshot states.*
    

* * *

### CCC.Vector.CP08 – Embedding Format Compatibility

- **Malformed format injection**  
    *Vectors in unexpected format crash indexing or miscomputed results.*
    
- **Embedding mismatch**  
    *Silent logical errors enable attack scenarios.*
    

* * *

### CCC.Vector.CP09 – Vector Dimension Management

- **Dimension inconsistency**  
    *Leads to index corruption or unexpected errors.*
    
- **High-dimensional overfitting**  
    *Can be exploited to skew similarity ranking.*
    

* * *

### CCC.Vector.CP10 – Multi-modal Vector Support

- **Cross-modal linkage threats**  
    *Connecting embeddings across modalities could enable re-identification.*
    
- **Modality inference**  
    *Determine data type (image vs text) from embedding patterns.*
    

* * *

### CCC.Vector.CP11 – Query Access Control

- \*\*Excessive read privileges\*\*  
    *Even read-only access may suffice to steal embeddings.*  
    **Matching FINOS mitigation:** *Preserve source access controls (AIR‑RC‑022)* emphasizes ACL consistency ([arxiv.org](https://arxiv.org/html/2504.06293v1?utm_source=chatgpt.com "Generative AI Enhanced Financial Risk Management Information ..."), [air-governance-framework.finos.org](https://air-governance-framework.finos.org/risks/ri-8_tampering-with-the-foundational-model.html?utm_source=chatgpt.com "Tampering With the Foundational Model"), [air-governance-framework.finos.org](https://air-governance-framework.finos.org/risks/ri-2_information-leaked-to-vector-store.html?utm_source=chatgpt.com "Information Leaked to Vector Store - FINOS AI Governance Framework"), [air-governance-framework.finos.org](https://air-governance-framework.finos.org/mitigations/mi-16_preserving-source-data-access-controls-in-ai-systems.html?utm_source=chatgpt.com "Preserving Source Data Access Controls in AI Systems")).
    
- **Side‑channel leakage**  
    *Differences in performance or results based on user could leak access info.*
    

* * *

### CCC.Vector.CP12 – Approximate or Exact Search Modes

- **Search bias exploitation**  
    *Approximate results may be manipulated or inconsistent.*
    
- **Forced precision downgrade**  
    *Attackers trigger ANN instead of exact search, affecting result fidelity.*
    

* * *

Let me know if you’d like a `threats.yaml` with IDs and mapping to AIR‑SEC‑002/009/RC‑022 built out next, or if you’d prefer to start writing control definitions aligned to these threats.

> &nbsp;This is great. Now let's create the threats.yaml file. Again, I'll give you the CCC common threats to reference (where you think they are needed), then you add your own threats in the style of the file from the object storage service (included)
> 
> this is great. One thing we like to do in ccc is put a comment next to the shared threats to remind readers what they are. Can you add those? (I've done the first one for you)

```yaml
shared-threats:
  - reference-id: CCC
    identifiers:
      - CCC.TH01 # Access Control is Misconfigured
      - CCC.TH02 # Data is Intercepted in Transit
      - CCC.TH03 # Deployment Region Network is Untrusted
      - CCC.TH04 # Data is Replicated to Untrusted or External Locations
      - CCC.TH05 # Data is Corrupted During Replication
      - CCC.TH06 # Data is Lost or Corrupted
      - CCC.TH07 # Logs are Tampered With or Deleted
      - CCC.TH08 # Cost Management Data is Manipulated
      - CCC.TH09 # Logs or Monitoring Data are Read by Unauthorized Users
      - CCC.TH10 # Alerts are Intercepted
      - CCC.TH11 # Event Notifications are Incorrectly Triggered
      - CCC.TH12 # Resource Constraints are Exhausted
      - CCC.TH13 # Resource Tags are Manipulated
      - CCC.TH14 # Older Resource Versions are Exploited
      - CCC.TH15 # Automated Enumeration and Reconnaissance by Non-human Entities
      - CCC.TH16 # Logging and Monitoring are Disabled
      - CCC.TH17 # Unauthorized Network Access via Misconfigured Rules
threats:
- id: CCC.Vector.TH01
  title: Embedding Extraction and Model Inversion
  description: Attackers may infer or reconstruct original data by probing vector
    similarity APIs, especially with unrestricted access. This enables model inversion
    attacks, membership inference, and unauthorized data leakage from stored embeddings.
  capabilities:
  - reference-id: CCC
    identifiers:
    - CCC.Vector.CP01
    - CCC.Vector.CP03
    - CCC.Vector.CP06
  external-mappings:
  - reference-id: FINOS-AIR
    identifiers:
    - AIR-SEC-002
- id: CCC.Vector.TH02
  title: Embedding and Index Poisoning
  description: Adversaries may insert malicious or adversarial vectors into the index
    through ingestion endpoints, polluting the dataset and degrading search quality,
    or subtly steering results toward specific outcomes.
  capabilities:
  - reference-id: CCC
    identifiers:
    - CCC.Vector.CP02
    - CCC.Vector.CP05
    - CCC.Vector.CP07
  external-mappings:
  - reference-id: FINOS-AIR
    identifiers:
    - AIR-SEC-009
- id: CCC.Vector.TH03
  title: Cross-modal or Metadata Leakage
  description: Attackers may infer sensitive information through metadata filters
    or by correlating embeddings across modalities (e.g., voice and face), bypassing
    surface-level access controls.
  capabilities:
  - reference-id: CCC
    identifiers:
    - CCC.Vector.CP04
    - CCC.Vector.CP10
  external-mappings:
  - reference-id: FINOS-AIR
    identifiers:
    - AIR-RC-022
- id: CCC.Vector.TH04
  title: Denial of Service via Query or Ingestion Flooding
  description: High-volume ingestion or excessive low-latency similarity queries can
    overwhelm vector indexing services, degrading performance for legitimate users
    and potentially exhausting system resources.
  capabilities:
  - reference-id: CCC
    identifiers:
    - CCC.Vector.CP05
    - CCC.Vector.CP06
- id: CCC.Vector.TH05
  title: Index Corruption or Downgrade
  description: Attackers with unauthorized access or excessive permissions may tamper
    with or roll back index versions, potentially restoring poisoned data or breaking
    downstream integrations.
  capabilities:
  - reference-id: CCC
    identifiers:
    - CCC.Vector.CP07
    - CCC.Vector.CP11
- id: CCC.Vector.TH06
  title: Embedding Format or Dimension Attacks
  description: Poor validation of embedding formats or dimensions can cause service
    crashes or logic errors. This can result in denial of service or incorrect similarity
    results.
  capabilities:
  - reference-id: CCC
    identifiers:
    - CCC.Vector.CP08
    - CCC.Vector.CP09
- id: CCC.Vector.TH07
  title: Search Result Manipulation via ANN Bias
  description: Approximate nearest neighbor (ANN) algorithms may yield non-deterministic
    or biased results. Adversaries may exploit these differences to evade detection
    or bias AI responses.
  capabilities:
  - reference-id: CCC
    identifiers:
    - CCC.Vector.CP12

```

### Give it the controls.yaml file from the storage bucket, ask for the same for the service you're doing.

> ok, yes, lets' move onto controls. For each of the threats you've identified, please sketch out some controls that you might put in place. I'll give you the object storage file as an example again, and the common controls too

```
Great. Based on the **seven vector-specific threats** identified earlier, here’s a structured list of corresponding **controls** (not yet fully formatted in CCC YAML style, but ready for that next step). These are conceptually aligned with the style and taxonomy used in the Object Storage controls, and reference common CCC controls where applicable.

---

### 🛡 CCC.Vector.TH01 – Embedding Extraction and Model Inversion

**Controls:**

* **Restrict Similarity Query Rate**
  Limit the rate and frequency of vector similarity queries per identity/IP to mitigate inference risk.
* **Require Query Authorization Scopes**
  Only allow similarity search to authorized identities explicitly granted inference access.
* **Enable Differential Privacy (Optional)**
  Apply noise or differential privacy mechanisms to similarity scoring to protect embedding semantics.
* **Cross-reference CCC controls:**

  * CCC.C03 (MFA for Access)
  * CCC.C05 (Prevent Access from Untrusted Entities)
  * CCC.C04 (Log All Access and Changes)

---

### 🛡 CCC.Vector.TH02 – Embedding and Index Poisoning

**Controls:**

* **Validate Embeddings Before Indexing**
  Require structural and statistical validation of all incoming vectors before acceptance.
* **Isolate Write Access via Roles**
  Enforce separation of ingestion privileges vs. querying/search roles.
* **Trigger Retraining Audits on Index Drift**
  Use drift or anomaly detection on index quality or search precision.
* **Cross-reference CCC controls:**

  * CCC.C03
  * CCC.C04
  * CCC.C09 (Prevent Log Tampering)

---

### 🛡 CCC.Vector.TH03 – Cross-modal or Metadata Leakage

**Controls:**

* **Enforce Metadata-level ACLs**
  Treat metadata fields as access-controlled resources; restrict filter visibility by role.
* **Audit Query Combinations**
  Detect and log high-risk correlation queries that combine sensitive metadata filters with embedding searches.
* **Cross-reference CCC controls:**

  * CCC.C04
  * CCC.C09

---

### 🛡 CCC.Vector.TH04 – Denial of Service via Query or Ingestion Flooding

**Controls:**

* **Set Query Rate Limits by Vector Index**
  Define rate limits and thresholds for vector queries at index level.
* **Ingestion Quota Enforcement**
  Define maximum batch sizes, ingestion quotas per client/service.
* **Adaptive Throttling**
  Auto-adjust rate limits based on backend latency or saturation.
* **Cross-reference CCC controls:**

  * CCC.C01 (Prevent Unencrypted Requests)
  * CCC.C12 (Secure Network Access Rules)

---

### 🛡 CCC.Vector.TH05 – Index Corruption or Downgrade

**Controls:**

* **Enable Index Versioning and Rollback Protection**
  Prevent unprivileged rollback to earlier poisoned states; log and control rollback events.
* **Audit All Index Lifecycle Events**
  Every create, delete, reindex event must be audit-logged and access-controlled.
* **Cross-reference CCC controls:**

  * CCC.C04
  * CCC.C09
  * CCC.C10 (Prevent Replication Outside Trust Boundary)

---

### 🛡 CCC.Vector.TH06 – Embedding Format or Dimension Attacks

**Controls:**

* **Strict Format and Dimensional Validation**
  Reject malformed or misdimensioned embeddings before index/write.
* **Support Multiple Model Profiles with Explicit Compatibility**
  Allow admins to register allowed vector profiles by dimensionality, source, etc.
* **Cross-reference CCC controls:**

  * CCC.C05
  * CCC.C04

---

### 🛡 CCC.Vector.TH07 – Search Result Manipulation via ANN Bias

**Controls:**

* **Allow Configuration of Search Fidelity Mode (ANN vs Exact)**
  Give search clients ability to declare need for exact match where needed.
* **Expose Search Quality Metrics**
  Return approximate confidence scores or result quality indicators.
* **Cross-reference CCC controls:**

  * CCC.C04
  * CCC.C07

---

Would you like me to now turn these into a formal `controls.yaml` block with full control-family, assessment-requirements, and threat mappings?

```

&nbsp;

> ok, this is great: let's invert this and produce a list of controls and the threats they address. Don't include controls that are already common to ccc, just include the new, vector-store controls.
> 
> ok, check again the included yaml file - many of your controls "overlap" common ones. We just need the specific new ones. for example, access controls is a common one.
> 
> yes, let me give you the common controls and the object store controls files to look at. Don't forget to include the comments (titles of threats / controls you're referencing)
> 
> This is ok. However, I'd like a bit more. Can you reference common threats as well as vector threats. Also, include any common controls you think are needed. Don't forget comments alongside the references in the JSON file
> 
> ok, just missing the shared-controls section

```
shared-controls:
  - reference-id: CCC
    identifiers:
      - CCC.C01 # Prevent Unencrypted Requests
      - CCC.C03 # Require MFA for Access
      - CCC.C04 # Log All Access and Changes
      - CCC.C05 # Prevent Access from Untrusted Entities
      - CCC.C06 # Require Access Approval
      - CCC.C07 # Limit Public Access to Resources
      - CCC.C09 # Prevent Log Tampering
      - CCC.C10 # Prevent Replication Outside Trust Boundary
      - CCC.C12 # Secure Network Access Rules

control-families:
  - title: Vector Indexing
    description: Controls specific to the management and protection of vector embedding and index operations.
    controls:
      - id: CCC.Vector.C01
        title: Validate Embeddings Before Indexing
        objective: Ensure all incoming embeddings are structurally and statistically validated before indexing to prevent poisoning or corruption.
        assessment-requirements:
          - id: CCC.Vector.C01.TR01
            text: When a vector embedding is submitted for indexing, the system MUST validate that it matches expected schema, dimension, and format profiles.
            applicability: [tlp-clear, tlp-green, tlp-amber, tlp-red]
            recommendation: ""
        threat-mappings:
          - reference-id: CCC
            identifiers:
              - CCC.Vector.TH02 # Embedding and Index Poisoning
              - CCC.Vector.TH06 # Embedding Format or Dimension Attacks
              - CCC.TH12 # Resource Constraints are Exhausted
        guideline-mappings: []
      - id: CCC.Vector.C02
        title: Enforce Role-Based Index Lifecycle Management
        objective: Restrict index lifecycle operations (create, delete, rollback) to privileged identities using fine-grained access controls.
        assessment-requirements:
          - id: CCC.Vector.C02.TR01
            text: When an index lifecycle event is triggered, the service MUST verify that the actor has explicit permissions for the operation type.
            applicability: [tlp-clear, tlp-green, tlp-amber, tlp-red]
            recommendation: ""
        threat-mappings:
          - reference-id: CCC
            identifiers:
              - CCC.Vector.TH02 # Embedding and Index Poisoning
              - CCC.Vector.TH05 # Index Corruption or Downgrade
              - CCC.TH01 # Access Control is Misconfigured
        guideline-mappings: []
      - id: CCC.Vector.C03
        title: Enforce Metadata-Level Access Controls
        objective: Apply access control policies to metadata fields used in filtering to prevent unauthorized exposure or inference.
        assessment-requirements:
          - id: CCC.Vector.C03.TR01
            text: When a metadata filter is applied to a query, the service MUST verify the requester is authorized to access that field.
            applicability: [tlp-amber, tlp-red]
            recommendation: ""
        threat-mappings:
          - reference-id: CCC
            identifiers:
              - CCC.Vector.TH03 # Cross-modal or Metadata Leakage
              - CCC.TH01 # Access Control is Misconfigured
        guideline-mappings: []
      - id: CCC.Vector.C04
        title: Enforce Ingestion Quotas and Throttling
        objective: Prevent ingestion-based DoS or index pollution by rate-limiting vector submissions and enforcing quotas.
        assessment-requirements:
          - id: CCC.Vector.C04.TR01
            text: When ingestion exceeds pre-defined thresholds, the service MUST throttle or reject excess vector write operations.
            applicability: [tlp-green, tlp-amber, tlp-red]
            recommendation: ""
        threat-mappings:
          - reference-id: CCC
            identifiers:
              - CCC.Vector.TH02 # Embedding and Index Poisoning
              - CCC.Vector.TH04 # Denial of Service via Query or Ingestion Flooding
              - CCC.TH12 # Resource Constraints are Exhausted
        guideline-mappings: []
      - id: CCC.Vector.C05
        title: Enforce Index Versioning with Rollback Protection
        objective: Ensure vector indexes are versioned and that rollback operations are authorized and auditable.
        assessment-requirements:
          - id: CCC.Vector.C05.TR01
            text: When a rollback is attempted, the system MUST log the action and verify rollback authorization.
            applicability: [tlp-amber, tlp-red]
            recommendation: ""
        threat-mappings:
          - reference-id: CCC
            identifiers:
              - CCC.Vector.TH05 # Index Corruption or Downgrade
              - CCC.TH09 # Logs or Monitoring Data are Read by Unauthorized Users
              - CCC.TH04 # Data is Replicated to Untrusted or External Locations
        guideline-mappings: []
      - id: CCC.Vector.C06
        title: Enforce Dimensional and Format Constraints
        objective: Reject embeddings that do not conform to expected model specifications (dimensions, format, etc).
        assessment-requirements:
          - id: CCC.Vector.C06.TR01
            text: When an embedding is submitted, the service MUST validate that its format and dimensionality match allowed profiles.
            applicability: [tlp-clear, tlp-green, tlp-amber, tlp-red]
            recommendation: ""
        threat-mappings:
          - reference-id: CCC
            identifiers:
              - CCC.Vector.TH06 # Embedding Format or Dimension Attacks
              - CCC.TH06 # Data is Lost or Corrupted
        guideline-mappings: []
      - id: CCC.Vector.C07
        title: Support Explicit ANN vs. Exact Search Configuration
        objective: Provide clients with the option to enforce exact-match (non-ANN) search where search fidelity is critical.
        assessment-requirements:
          - id: CCC.Vector.C07.TR01
            text: When a search request is issued, clients MUST be allowed to declare their requirement for exact vs approximate results.
            applicability: [tlp-amber, tlp-red]
            recommendation: ""
        threat-mappings:
          - reference-id: CCC
            identifiers:
              - CCC.Vector.TH07 # Search Result Manipulation via ANN Bias
        guideline-mappings: []

```

### Build A PR

![Screenshot 2025-06-20 at 17.32.17.png](:/ade179e0eb6340e68e0e9962f005c0ae)

### Pass The Checks

- Updated schema to allow AIR-SEC- and AIR-RC- references.
- Fixed line lengths to be shorter
- No spaces at the end of lines
