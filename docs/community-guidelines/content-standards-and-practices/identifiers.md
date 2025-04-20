# CCC Taxonomy ID Assignment Guidelines

This document provides a standardized approach for assigning unique identifiers (IDs) to various entities within the CCC Taxonomy, including Service Families, service categories, capabilities, threats, controls, test requirements, and tests. Adhering to this standard ensures consistency and clarity across all related documentation and implementations.

| **ID Type**          | **Format**                                  | **Example**            |
| -------------------- | ------------------------------------------- | ---------------------- |
| **Service Family**   | `CCC.<ServiceType>`                         | `CCC.Storage`          |
| **Service Category** | `CCC.<ServiceCategory>`                     | `CCC.ObjStor`          |
| **Capability**          | `CCC.<ServiceCategory>.F<##>`               | `CCC.ObjStor.F01`      |
| **Threat**           | `CCC.<ServiceCategory>.TH<##>`              | `CCC.RDMS.TH01`        |
| **Control**          | `CCC.<ServiceCategory>.C<##>`               | `CCC.VM.C01`           |
| **Test Requirement** | `CCC.<ServiceCategory>.C<##>.TR<##>`        | `CCC.VM.C01.TR01`      |
| **Test**             | `CCC.<ServiceCategory>.C<##>.TR<##>.TE<##>` | `CCC.VM.C01.TR01.TE01` |

## Service Families

Service types are used to group related service categories under a common label.

Each Service Family ID follows the format `CCC.<ServiceType>`.

### Examples

- **CCC.Storage** - Represents the Storage Service Family.
- **CCC.Compute** - Represents the Compute Service Family.
- **CCC.DB** - Represents the Database Service Family.
- **CCC.Network** - Represents the Networking Service Family.

## Service Categories

Service categories are specific classifications within a Service Family. Because the service category name is unique, the ID does not need to reference the parent type.

Each service category ID follows the format `CCC.<ServiceCategory>`.

### Examples

- **CCC.ObjStor** - Represents the Object Storage service category under `CCC.Storage`.
- **CCC.RDMS** - Represents the Relational Database Management System service category under `CCC.DB`.
- **CCC.VM** - Represents the Virtual Machine service category under `CCC.Compute`.

## Capabilities

Capabilities are specific functionalities or capabilities that are expected for a service to be portable with other services in that service category.

Each feature ID follows the format `CCC.<ServiceCategory>.F<##>`.

### Examples

- **CCC.ObjStor.F01** - The first feature in the Object Storage service category.
- **CCC.RDMS.F01** - The first feature in the RDMS service category.

## Threats

Threats are potential security risks associated with a service category.
Controls and threats have a "many to many" releationship, where

Each threat ID follows the format `CCC.<ServiceCategory>.TH<##>`.

### Examples

- **CCC.RDMS.TH01** - The first threat in the RDMS service category.
- **CCC.VM.TH10** - The tenth threat in the Virtual Machine service category.

## 5. Controls

Controls are security measures designed to mitigate specific threats.
Each control will contain a set of Test Requirements.

Each control ID follows the format `CCC.<ServiceCategory>.C<##>`.

### Examples

- **CCC.VM.C01** - The first control in the Virtual Machine service category.
- **CCC.ObjStor.C02** - The second control in the Object Storage service category.

## 6. Test Requirements

Test requirements are specific conditions or criteria that must be met to validate the associated control.
Each Test Requirement will map to a set of Tests.

Each test requirement ID follows the format `CCC.<ServiceCategory>.C<##>.TR<##>`.

### Examples

- **CCC.VM.C01.TR01** - The first test requirement for the first control in the Virtual Machine service category.
- **CCC.ObjStor.C02.TR02** - The second test requirement for the second control in the Object Storage service category.

## 7. Tests

Tests are individual assessments or procedures that fulfill a test requirement. These should be written in Gherkin for easy implementation.

Each test ID follows the format `CCC.<ServiceCategory>.C<##>.TR<##>.TE<##>`.

### Examples

- **CCC.VM.C01.TR01.TE01** - The first test for the first test requirement of the first control in the Virtual Machine service category.
- **CCC.ObjStor.C02.TR02.TE02** - The second test for the second test requirement of the second control in the Object Storage service category.

## Summary

This guideline ensures that each element within the CCC Taxonomy is uniquely identifiable and traceable through a standardized naming convention. Consistent use of these formats across documentation, implementation, and communication will improve clarity and reduce the risk of errors.
