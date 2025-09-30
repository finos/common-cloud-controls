
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

# CCC.GenAI vDEV (Generative AI Platform)

Generative AI Platform consist of set of tools provided by the cloud service providers
that use large language models (LLMs) and deep learning frameworks to
understand, generate, and manipulate natural language, images, code, or audio to
create new content, and insights base on patterns and data.


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

The following capabilities are required to be present on a resource for it to be considered a Generative AI Platform service. Threats outlined later in this catalog are assesssed based on the presence of these capabilities.

- **CCC.GenAI.F01: Text-Based Model Selection**
  
  Ability to select a foundation model that excels at natural language understanding and generation tasks such as summarization, translation, text generation, question answering, and sentiment analysis.

- **CCC.GenAI.F02: Code-Based Model Selection**
  
  Ability to select a foundation model that focuses on code understanding, generation, and transformation tasks.

- **CCC.GenAI.F03: Embedding Model Selection**
  
  Ability to select a foundation model used for tasks like semantic search, clustering, and document similarity by converting text into vector embeddings.

- **CCC.GenAI.F04: Image-Based Model Selection**
  
  Ability to select a foundation model that focuses on tasks related to vision, such as image generation, editing, and manipulation.

- **CCC.GenAI.F05: Multimodal Model Selection**
  
  Ability to select a foundation model that supports more than one modality, such as combining text and image.

- **CCC.GenAI.F06: Customizable Model Selection**
  
  Provide users the ability to fine-tune models with their own data.

- **CCC.GenAI.F07: Parameter Tuning - Temperature**
  
  Ability to control the randomness and creativity of the response.

- **CCC.GenAI.F08: Parameter Tuning - Max Token**
  
  Ability to limit the length of the response.

- **CCC.GenAI.F09: Parameter Tuning - Top P (Nucleus Sampling)**
  
  Ability to adjust the number of likely next tokens to consider based on cumulative probability.

- **CCC.GenAI.F10: Parameter Tuning - Top K**
  
  Ability to limit the number of token choices for the next word.

- **CCC.GenAI.F11: Parameter Tuning - Stop Sequences**
  
  Ability to halt generation when a predefined sequence is encountered.

- **CCC.GenAI.F12: Parameter Tuning - Frequency Penalty**
  
  Ability to penalize words that have been used frequently, reducing their likelihood of being repeated.

- **CCC.GenAI.F13: Parameter Tuning - Presence Penalty**
  
  Ability to penalize tokens that have already been used, encouraging the model to introduce new tokens.

- **CCC.GenAI.F14: Parameter Tuning - Context Length**
  
  Ability to control how much prior conversation or input the model will use for generating coherent responses.

- **CCC.GenAI.F15: Text-Based Prompts**
  
  Ability to input prompts in plain text.

- **CCC.GenAI.F16: Structured Prompts**
  
  Ability to provide structured input such as JSON as prompts.

- **CCC.GenAI.F17: Contextual Prompts**
  
  Ability to provide context or background information within the prompt to guide the response.

- **CCC.GenAI.F18: Interactive Prompts**
  
  Ability to use conversational prompts to create interactive dialogues.

- **CCC.GenAI.F19: Image-Based Prompts**
  
  Ability to input an image as a prompt to generate a response.

- **CCC.GenAI.F20: Custom Template Prompts**
  
  Ability to define custom templates or structures for prompts to standardize interactions with the models.

- **CCC.GenAI.F21: Generate Content**
  
  Ability to generate a response given a foundation model, parameter values, and a prompt.

- **CCC.GenAI.F22: Data Control**
  
  Ensures prompts, model outputs, embeddings, and training data fed by customers are not used to train foundation models.

- **CCC.GenAI.F23: Data Storage**
  
  Ability to retrieve previously generated outputs and prompts for the given session.

- **CCC.GenAI.F24: Data Residency**
  
  Ability to select a region for processing and storing data in the service.

- **CCC.GenAI.F25: Content Moderation**
  
  Ensure the service detects and filters abusive, harmful, and sensitive information to ensure responsible and safe use of the service.

- **CCC.GenAI.F26: Plugin Integrations**
  
  Ability for the model to use tools to complete a model interaction. For example web search, python code execution or external maths engine.

- **CCC.Core.F01: Encryption in Transit Enabled by Default**
  
  The service automatically encrypts all data using industry-standard cryptographic protocols prior to transmission via a network interface.

- **CCC.Core.F02: Encryption at Rest Enabled by Default**
  
  The service automatically encrypts all data using industry-standard cryptographic protocols prior to being written to a storage medium.

- **CCC.Core.F03: Access Log Publication**
  
  The service automatically publishes structured, verbose records of activities performed within the scope of the service by external actors.

- **CCC.Core.F06: Access Control**
  
  The service automatically enforces user configurations to restrict or allow access to a specific component or a child resource based on factors such as user identities, roles, groups, or attributes.

- **CCC.Core.F09: Metrics Publication**
  
  The service automatically publishes structured, numeric, time-series data points related to the performance, availability, and health of the service or its child resources.

- **CCC.Core.F10: Log Publication**
  
  The service automatically publishes structured, verbose records of activities, operations, or events that occur within the service.

- **CCC.Core.F14: API Access**
  
  The service exposes a port enabling external actors to interact programmatically with the service and its resources using HTTP protocol methods such as GET, POST, PUT, and DELETE.

- **CCC.Core.F15: Cost Management**
  
  The service monitors data published by child or networked resources to infer usage patterns and generate cost reports for the service.

- **CCC.Core.F16: Budgeting**
  
  The service may be configured to take a user-specified action when a spending threshold is met or exceeded on a child or networked resource.

- **CCC.Core.F18: Resource Versioning**
  
  The service assigns versions to child resources to preserve, retrieve, and restore past iterations.

- **CCC.Core.F19: Resource Scaling**
  
  The service may be configured to scale child resources automatically or on-demand.

- **CCC.Core.F20: Resource Tagging**
  
  The service provides users with the ability to tag a child resource with metadata that can be reviewed or queried.


<div style="page-break-after: always;"></div>

## Threats

The following threats have been identified based upon Generative AI Platform service capabilities. Controls outlined later in this catalog are designed to mitigate these threats. If you are aware of threats to Generative AI Platform services that are not captured here, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the identified threats, which is then followed by an elucidation of each threat and relevant mappings.

|Threat ID|Threat Title|
|----|----|

---


<div style="page-break-after: always;"></div>

## Controls

The following controls have been designed to mitigate the aforementioned threats that have been identified for CCC.GenAI. Each control includes one or more Assessment Requirements that should always pass for a service to be considered compliant with this control catalog. If your experience can help improve these controls, please refer to the Common Cloud Controls contributing guide for information about how you can help improve this catalog.

Below is a summary table of the controls, which is then followed by an elucidation of each control and relevant mappings.

|Control ID|Control Title|
|----|----|
