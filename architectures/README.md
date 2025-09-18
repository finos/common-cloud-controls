# CCC Reference Architectures

This directory contains control catalogs that are designed for complex inter-networked systems.

The intent and format of these documents contrasts with the other parts of CCC in approach, but adheres to the same schema.

However, architectures will not always have capabilities or threats documented, as those are likely to be inherited by the shared control catalogs. In the event that additional threats are found, they should have corresponding `threats` and `control-families` in their respective files.

This approach allows us to select the applicable threats that remain, as many threats will be mitigated by proper integration with another system. The same is true for controls from each catalog, and this approach will omit any controls that are no longer necessary.

Note that this requires each applicable control to be explicitly named, and shared controls from each catalog will not be automatically included here.

External catalogs should be given unique identifiers in `metadata.yaml` in order to be referenced in other files.

Any applicability categories that are used within referenced catalogs should be defined in `metadata.yaml` as well.

Each architecture directory should also contain a README.md that details the design goals.
