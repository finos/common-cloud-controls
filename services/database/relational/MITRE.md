# Relational Database Management Systems MITRE Threats

> Discussion points:
> * Should this information be recorded in a Gherkin Feature Doc
> * What is the idealised format for the Gherkin
> * Should the threats be presented as per taxonomy feature or as per MITRE ATT&CK Matrix Tactic & Technique
> * Some of the Gherkin will describe destructive actions

This document takes the MITRE ATT&CK matrix and for each Tactic under a Technique heading, describes an attack on the RDMS service using Gherkin. This can be used to then test the behaviour of applied controls under the philosophy that security tests test behaviour not for expected configuration.

## Gherkin Format

The suggested format (for discussion) is:

Scenario: THREAT ID - Human readable threat description  
  Given Service  
  and Taxonomy Feature  
  When A "<THREAT ACTOR>" requests/ enacts attack x  
  And Attack success criteria  
  Then MITRE Technique Ref  
  And MITRE ATT&CK Tactic  
  And Loss of Service Taxonomy Feature C/I/A 