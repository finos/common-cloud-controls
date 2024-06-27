# Definition of Done (DoD) for a Service

This is the set of criteria that a service must meet for the team to consider it complete and ready for its consumers.

## DoD for a Leaf Level Service

Leaf Level Service in a service that will not be further categorised into subcategories. For an example _Relational Databases_ is a leaf level service when _Databases_ is a higher-level service.

Set of criteria that a leaf level service must meet for the team to consider it complete and ready for consumers are as follows,

- A comprehensive set of minimum viable controls should be identified for the service
- All possible higher-level groupings of the control should be identified to minimize duplication of controls.
- A folder should be created under **services** folder in the repository for the leaf level service which clearly depicts its place in the hierarchy of services.
- All identified controls should be documented in a `taxonomy.md` file under the folder created for the leaf level service.
- All identified controls should be numbered according to the _common-cloud-control_ guidelines.
- A description should be provided for all identified controls.
- All higher-level service categorizations should be completed that relates to the leaf level service.
- An asset describing the ways to test the presence of each control should be documented in feature file with the name `<service-name>.feature`.
