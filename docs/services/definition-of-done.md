# Definition of Done (DoD) for a Service

Service in this context is anything that can not be further categorized into subcategories. For example _Relational Databases_ is a service where _Databases_ is considered as a higher level grouping of common features among all different types of databases.

Stated below is the set of criteria that a service must meet for the team to consider it complete and ready for its consumers.

- A comprehensive set of minimum viable features should be identified for the service.
- All possible higher-level groupings of features should be identified for the service.
- A folder should be created with the name of the service, under **services** folder in the repository which clearly depicts its place in the taxonomy. E.g. `services > databases > relational` where _relational_ is the service name and _databases_ is the higher-level grouping
- All identified features should be documented in a `taxonomy.md` file under the folder created for the service.
- All identified features should be numbered according to the _common-cloud-control_ guidelines.
- A description should be provided for all identified features.
- An asset describing the ways to test the presence of each control should be documented in feature file with the name `<service-name>.feature`.
- All higher-level groupings in the hierarchy should be completed with `taxonmy.md` and `<service-name>.feature` files of its own containing the common features.
