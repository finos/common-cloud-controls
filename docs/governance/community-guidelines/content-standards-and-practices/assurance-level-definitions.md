# Common Cloud Controls (CCC) Assurance Levels and Certification Scope

**Assurance levels** represent the degree of confidence that a cloud resource or service is secure, reliable, and capable of withstanding threats. These levels are based on the security measures in place, and they align with the **risk environments** within an organization. Higher assurance levels are required in higher-risk environments, such as those handling sensitive data or critical infrastructure.

The **Common Cloud Controls (CCC)** framework defines these assurance levels to guide organizations in securing cloud resources, such as managed services or Infrastructure as Code (IaC) modules. While the CCC is not a certifying authority, it outlines certification criteria based on varying assurance levels that organizations can adopt. Certification may only be issued if a resource meets the required assurance level criteria, depending on its intended risk environment.

## Assurance Levels for Certification

Each assurance level builds on the previous one, progressively increasing the security requirements. This allows organizations to match the assurance level of their cloud resources to the risk environment in which they operate. For example, higher-risk environments, such as those in financial services, would require higher assurance levels.

### **Level 0 - Portable Certification**

- **Description:** The resource meets basic portability requirements, ensuring consistent deployment across cloud environments.
- **Risk Environment:** Low-risk environments where security is less critical but portability and flexibility are key.
- **Criteria:**
  - The resource is portable according to the corresponding CCC taxonomy.
- **Use Case:** Suitable for resources that need to function as **drop-in replacements** within common services, enabling seamless integration across different cloud platforms or environments. This is ideal for situations where organizations require the flexibility to quickly swap or scale controls, such as when migrating services or standardizing across multi-cloud architectures.

### **Level 1 - Secure Certification**

- **Description:** The resource is both portable and secure by default, following CCC security guidelines.
- **Risk Environment:** Moderate-risk environments, such as general enterprise deployments, where security configurations are important but not mission-critical.
- **Criteria:**
  - Meets the portability requirements of Level 0.
  - The resource is secure according to the CCC component definition, meaning it follows default security configurations.
- **Use Case:** Appropriate for cloud resources used in enterprise environments, ensuring basic security measures like encryption and access controls are in place.

### **Level 2 - Threat-Model Informed Certification**

- **Description:** The resource is portable, secure, and incorporates controls informed by a formal threat model.
- **Risk Environment:** High-risk environments where sensitive data is handled, such as financial services or healthcare, and where threats must be systematically assessed and addressed.
- **Criteria:**
  - Meets the requirements of Level 1.
  - A **threat model** has been applied to identify potential vulnerabilities and tailor CCC controls to mitigate those risks.
- **Use Case:** For resources operating in environments with heightened security concerns, such as handling PII or regulated data, where threat analysis is crucial to ensure robust protection.

### **Level 3 - Red-Team Informed Certification**

- **Description:** The resource is portable, secure, informed by a threat model, and tested through red-teaming activities.
- **Risk Environment:** Mission-critical and very high-risk environments, such as critical infrastructure or national security, where real-world attacks could have catastrophic impacts.
- **Criteria:**
  - Meets the requirements of Level 2.
  - A **red-teaming activity** has been conducted, simulating real-world attacks, and the CCC controls have been adjusted based on findings to ensure comprehensive security.
- **Use Case:** This highest assurance level is for resources that need to withstand sophisticated, real-world threats and attacks.

## Summary Table of CCC Assurance Levels

| **Assurance Level** | **Description**                     | **Criteria**                                                                                                 | **Risk Environment**              |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Level 0**         | Portable Certification              | Resource meets CCC portability requirements.                                                                 | Low Risk                          |
| **Level 1**         | Secure Certification                | Resource meets portability and CCC security guidelines for secure-by-default configurations.                 | Moderate Risk                     |
| **Level 2**         | Threat-Model Informed Certification | Resource is secure, and a threat model has informed the CCC controls.                                        | High Risk                         |
| **Level 3**         | Red-Team Informed Certification     | Resource is secure, threat-model informed, and red-teaming has been performed to validate security controls. | Very High Risk / Mission-Critical |

## Conclusion

The **Common Cloud Controls (CCC)** assurance framework provides a clear path for organizations to align their cloud resources' security with the appropriate risk environment. Each assurance level, from **Level 0** to **Level 3**, is designed to meet the varying demands of cloud environments, with higher levels of assurance required as the risk increases.

For low-risk environments, **Level 0** provides basic portability. As security needs grow, **Level 1** offers secure-by-default configurations. In high-risk environments, **Level 2** ensures that a threat model informs the controls, while **Level 3** ensures maximum security with red-teaming activities validating the defenses. Although CCC does not certify resources, these levels offer a guide for achieving certification and ensuring resources are secure according to their specific risk environment.
