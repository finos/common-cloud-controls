# Mitre Engenuity

## Overview

MITRE Engenuity is a non-profit organization that operates under the MITRE Corporation, focused on advancing public good by driving innovative solutions and technologies. It collaborates with government, industry, and academia to address critical challenges in areas like cybersecurity, artificial intelligence, and healthcare. MITRE Engenuity is known for its threat-informed defense strategies, particularly its ATT&CK® framework, which enhances cybersecurity through collaborative research and threat intelligence sharing. By fostering cross-sector partnerships, it aims to accelerate the development of cutting-edge tools and methodologies that strengthen global security and innovation.

- [Main Website](https://mitre-engenuity.org)

## NIST 800-53 CONTROLS TO ATT&CK MAPPINGS

> "This project created a comprehensive set of mappings between MITRE ATT&CK® and NIST Special Publication 800-53 with supporting documentation and resources. These mappings provide a critically important resource for organizations to assess their security control coverage against real-world threats as described in the ATT&CK knowledge base and provide a foundation for integrating ATT&CK-based threat information into the risk management process. With over 6,300 individual mappings between NIST 800-53 and ATT&CK, this resource greatly reduces the burden on the community to do their own baseline mappings– allowing organizations to focus their limited time and resources on understanding how controls map to threats in their specific environment. "

- [Project Link (Now Archived)](https://github.com/center-for-threat-informed-defense/attack-control-framework-mappings)
- [NIST 800-53 Mappings Explorer (New Reference)](https://center-for-threat-informed-defense.github.io/mappings-explorer/external/nist/)

### Example

[NIST 800-53 (Rev 5) Declares a Mapping for Malicious Code Protection](https://center-for-threat-informed-defense.github.io/mappings-explorer/external/nist/attack-14.1/domain-enterprise/nist-rev5/SI-03/) like so:

> "System entry and exit points include firewalls, remote access servers, workstations, electronic mail servers, web servers, proxy servers, notebook computers, and mobile devices. Malicious code includes viruses, worms, Trojan horses, and spyware. Malicious code can also be encoded in various formats contained within compressed or hidden files or hidden in files using techniques such as steganography. Malicious code can be inserted into systems in a variety of ways, including by electronic mail, the world-wide web, and portable storage devices. Malicious code insertions occur through the exploitation of system vulnerabilities. A variety of technologies and methods exist to limit or eliminate the effects of malicious code. (...)"

This is mapped in m:n fashion with MITRE ATT&CKs. For this particular mapping, 214 Att&cks are linked, including Att&ck [T1001.002 Steganography](https://center-for-threat-informed-defense.github.io/mappings-explorer/attack/attack-14.1/domain-enterprise/techniques/T1001.002/):

> "Adversaries may use steganographic techniques to hide command and control traffic to make detection efforts more difficult. Steganographic techniques can be used to hide data in digital messages that are transferred between systems. This hidden information can be used for command and control of compromised systems. In some cases, the passing of files embedded using steganography, such as image or document files, can be used for command and control."

Further, T1001.002 Steganography is mapped n:m back to 8 NIST 800-53 Controls, including the one first cited as well as:

- Information Flow Enforcement
- Continuous Monitoring
- Baseline Configuration
- Configuration Settings
- Boundary Protection
- Malicious Code Protection (as discussed)
- System Monitoring

![Screenshot 2024-09-12 at 14 50 07](https://github.com/user-attachments/assets/26f15876-d47f-447f-9f6a-ace0f713801b)

### Coverage

- Rev4 and Rev5 of NIST 800-53
- Att&ck 14.1, 12.1, 10.1, 9.0 and 8.2
- Enterprise Att&ck domain

### Similar Work

- [M365 Native security capabilities vs Att&ck](https://mitre-engenuity.org/cybersecurity/center-for-threat-informed-defense/our-work/security-stack-mappings-microsoft-365/)

## Technique Inference Engine

> "Know your adversary’s next move with the Technique Inference Engine, a machine learning-powered tool that infers unseen adversary techniques, providing security teams actionable intelligence."

A model to infer an attacker’s next technique, based on observed adversary operations.

- [Project Website](https://center-for-threat-informed-defense.github.io/technique-inference-engine/#/)

### Example

Given an Att&ck, e.g. T1001.002 Steganography (again), what techniques is an attacker likely to employ next? According to this tool, it will be:

![Screenshot 2024-09-12 at 14 49 06](https://github.com/user-attachments/assets/59835eb4-25ae-4598-838d-4c6facf650a7)

## Resource Links

- [News Page](https://mitre-engenuity.org/news-insights/)
