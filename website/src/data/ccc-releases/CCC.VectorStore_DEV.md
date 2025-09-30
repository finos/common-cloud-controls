
<style>
body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: 0.2in;
    font-size: 11pt;
    line-height: 1.5;
    color: #333333;
}
h1, h2, h3, h4{
    color: #1A5276;
    margin-top: 0.5in;
    margin-bottom: 0.2in;
    font-weight: bold;
}
h1 { font-size: 22t; }
h2 { font-size: 18pt; }
h3 { font-size: 16pt; }
h4 { font-size: 14pt; }
p { 
	font-size: 11pt;
	margin-bottom: 0.15in;
}
img {
	max-height: 100px
}

code, pre {
    background-color: #f8f8f8;
    padding: 0.2in;
    border: 1px solid #dddddd;
    border-radius: 4px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 10pt;
    overflow-x: auto;
}
blockquote {
    margin: 0.5in 0;
    padding: 0.3in;
    border-left: 5px solid #cccccc;
    font-style: italic;
}
table {
	width: 100%;
	border-collapse: collapse;
	border-style: hidden;
}
th, td {
	border: 1px solid #ddd;
	padding: 8px;
}
.flex-container {
    display: flex;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
}
.flex-item-left {
    flex: 1;
    padding-right: 10px;
}
.flex-item-right {
    flex: 1;
    padding-left: 10px;
}
@page {
    margin: 0.2in;
}
</style>



<img width="50%" src="https://raw.githubusercontent.com/finos/branding/882d52260eb9b85a4097db38b09a52ea9bb68734/project-logos/active-project-logos/Common%20Cloud%20Controls%20Logo/Horizontal/2023_FinosCCC_Horizontal_BLK.svg" alt="CCC Logo"/>

# CCC.VectorStore vDEV (Managed Vector Store)

A Managed Vector Store is a specialized data service designed to store, index, and
retrieve high-dimensional vector embeddings, enabling similarity search and machine
learning inference. These services are used in AI/ML pipelines for use cases such as
semantic search, recommendation systems, and generative AI applications. Vector
stores support operations like nearest neighbor search using approximate or exact
methods and integrate with model-serving and ingestion pipelines. They are
optimized for performance, scale, and integration with cloud-native tools.


<div style="page-break-after: always;"></div>

## Release Details

> This is a development build without formal release details.
>
> _- Development Build,  ([](https://github.com/))_

### Contributors to this Release

| Name | Company | GitHub ID |
| ---- | ------- | ------ |
| Development Team |  | [](https://github.com/) |

<div style="page-break-after: always;"></div>

## Capabilities

The following capabilities are required to be present on a resource for it to be considered a Managed Vector Store service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.Vector.F01: Embedding Storage**
  
  Supports storage of high-dimensional vector embeddings derived from raw input data such as text, images, or audio.

- **CCC.Vector.F02: Vector Indexing**
  
  Provides creation and management of indexes optimized for similarity search, such as HNSW, IVF, or PQ.

- **CCC.Vector.F03: Similarity Search**
  
  Enables nearest-neighbor queries using a query embedding to return the most similar vectors from the store.

- **CCC.Vector.F04: Metadata Filtering**
  
  Supports structured filtering on metadata fields alongside vector similarity search queries.

- **CCC.Vector.F05: Batch Ingestion**
  
  Allows for high-throughput batch upload and deletion of vectors and associated metadata.

- **CCC.Vector.F06: Real-Time Querying**
  
  Provides low-latency response to vector similarity queries suitable for interactive applications.

- **CCC.Vector.F07: Index Lifecycle Management**
  
  Enables automated or manual creation, optimization, and removal of vector indexes.

- **CCC.Vector.F08: Embedding Format Compatibility**
  
  Supports standard vector formats and integrates with common embedding generators (e.g., OpenAI, HuggingFace, TensorFlow).

- **CCC.Vector.F09: Vector Dimension Management**
  
  Supports storing and managing vectors of specific or dynamic dimensionality, depending on model needs.

- **CCC.Vector.F10: Multi-modal Vector Support**
  
  Supports storing and searching across vectors derived from multiple modalities (e.g., text, image, audio).

- **CCC.Vector.F11: Query Access Control**
  
  Provides the ability to restrict who can run vector similarity or metadata filter queries, separate from data modification rights.

- **CCC.Vector.F12: Approximate or Exact Search Modes**
  
  Supports both approximate nearest neighbor (ANN) algorithms for speed and exact search modes for precision-critical applications.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon Managed Vector Store service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Managed Vector Store services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|

---


<div style="page-break-after: always;"></div>

## Controls

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.VectorStore. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
