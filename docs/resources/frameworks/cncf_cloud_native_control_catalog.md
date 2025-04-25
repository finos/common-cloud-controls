# CNCF Cloud Native Security Controls Catalog Summary

The **Cloud Native Computing Foundation (CNCF) Cloud Native Security Controls Catalog** serves as a guide for organizations seeking to implement secure cloud-native practices by providing a structured list of security controls and recommendations. It is primarily based on two key documents:

1. **Cloud Native Security Whitepaper (CNSWP v1.0)**: This document outlines the foundational principles and best practices for securing cloud-native applications and infrastructure, emphasizing a holistic approach to cloud security.

2. **Software Supply Chain Best Practices Paper (SSCP v1.0)**: This publication focuses on securing the software supply chain within cloud-native environments, offering guidelines to protect against vulnerabilities and threats throughout the software development lifecycle.

## Structure of the CNCF Control Catalog

The CNCF control catalog is structured with the following headings:

1. **ID**: A unique identifier for each control, which may change as the catalog evolves.
2. **Originating Document**: Specifies whether the control originates from the CNSWP or SSCP documents.
3. **Section**: Equates to a control family or type, providing context on the area of security the control addresses.
4. **Control Title**: A brief description of the control.
5. **Mapping to NIST 800-53r5**: References corresponding NIST security controls, facilitating integration with existing frameworks.
6. **Assurance Level**: Indicates the level of confidence required for the control's implementation, though not well-documented within the catalog.
7. **Risk Categories**: Classifies controls based on risk, with descriptions derivable from the SSCP and CNSWP documents.

## Key Capabilities

- **Kubernetes Focus**: The catalog is specifically tailored to address security concerns within Kubernetes environments.
- **NIST Alignment**: Provides mappings to NIST 800-53r5 controls, aligning with recognized security standards.
- **Community-Driven**: Developed with input from the CNCF community.

## Comparison with Common Cloud Controls (CCC) Catalog

The **Common Cloud Controls (CCC) Catalog** is designed to cover cloud service provider (CSP) services more broadly across different platforms. Below is a comparison highlighting similarities, differences, and areas of potential integration:

### Similarities

- **Security Objectives**: Both catalogs aim to enhance cloud security by providing structured control frameworks and recommendations.
- **NIST Mapping**: Each catalog includes mappings to NIST standards, supporting alignment with established security frameworks.

### Differences

- **Scope**:

  - **CNCF Catalog**: Focused primarily on Kubernetes and related cloud-native technologies.
  - **CCC Catalog**: Broader focus on various CSP services, encompassing a wider range of cloud platforms.

- **Detail Level**:

  - **CNCF Catalog**: Less detailed, offering high-level control descriptions without specific testing requirements.
  - **CCC Catalog**: More comprehensive, including detailed implementation guidance and testing requirements.

- **Structure**:
  - **CNCF Catalog**: Organized with seven headings, lacking explicit references to testing requirements.
  - **CCC Catalog**: More detailed structure, including mappings to service capabilities and testing requirements.

### Areas for further CCC consideration

1. **Section (Control Family/Type)**:

   - **CNCF Feature**: The section heading in the CNCF catalog equates to a control family or type, providing clear categorization.
   - **Recommendation**: Incorporate a similar "Section" heading into the CCC catalog to improve organization and navigation.

2. **Assurance Level**:

   - **CNCF Feature**: Although not well-documented, assurance levels indicate the confidence required in control implementation.
   - **Recommendation**: Consider integrating assurance levels into the CCC catalog to provide additional context on control importance and implementation rigor.

3. **Risk Categories**:
   - **CNCF Feature**: Classifies controls based on risk, derived from the CNCF SSCP and CNSWP documents.
   - **Recommendation**: Consider integrating risk categories into the CCC catalog to prioritize controls based on impact and likelihood, leveraging insights from CNCF documents.
