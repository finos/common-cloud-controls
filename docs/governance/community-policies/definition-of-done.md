# Definition of Done (DoD) for a Service

Service in this context is anything that can not be further categorized into subcategories. For example _Relational Databases_ is a service where _Databases_ is considered as a higher level grouping of common features among all different types of databases.

Below is the set of criteria that a service must meet to be ready for delivery.

- A comprehensive set of minimum viable features have been identified for the service.
- All possible higher-level groupings of features have been identified for the service.
- A subdirectory has been created under **services** directory, with the name of the service, according to its place in the taxonomy. (e.g. `services/databases/relational/` where _relational_ is the service name and _databases_ is the higher-level grouping)
- All identified features have been documented in a `<service-name-short>-taxonomy.md` file within the directory created for the service.
- All common features have been numbered according to the (numbering format guideline)[../numbering-format.md].
- A description has been provided for all common features.
- An gherkin feature file describing the ways to test the presence of each control has been cretated in the service directory with the name `<service-name-short>-taxonomy.feature`.
- All higher-level groupings in the hierarchy have been completed with `<service-name-short>-taxonomy.md` and `<service-name-short>-taxonomy.feature` files of its own containing the common features.