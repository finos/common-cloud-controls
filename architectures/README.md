# CCC Reference Architectures

This directory contains control catalogs that are designed for complex inter-networked systems.

The intent and format of these documents contrasts with the other parts of CCC in approach, but adheres to the same schema.

However, architectures will not always have capabilities or threats documented, as those are likely to be inherited by the shared control catalogs. In the event that additional threats are found, they should have corresponding controls captured within the `control-families` field.

This approach allows us to select the applicable controls from each catalog, omitting any controls that are addressed by another technology in this reference architecture.

Note that this requires each applicable control to be explicitly named, and shared controls from each catalog will not be automatically included here.

Each directory should also contain a README.md that details the design goals.
