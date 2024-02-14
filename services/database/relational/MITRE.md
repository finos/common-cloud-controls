# Relational Database Management Systems MITRE Threats

> Discussion points:
> * Should this information be recorded in a Gherkin Feature Doc
> * What is the idealised format for the Gherkin
> * Should the threats be presented as per taxonomy feature or as per MITRE ATT&CK Matrix Tactic & Technique
> * Some of the Gherkin will describe destructive actions

This document takes the MITRE ATT&CK Enterprise Cloud IAAS matrix and for each Tactic under a Technique heading, describes an attack on the RDMS service using Gherkin. This can be used to then test the behaviour of applied controls under the philosophy that security tests test behaviour not for expected configuration.

## Gherkin Format

The suggested format (for discussion) is:

```gherkin
Scenario: THREAT ID - Human readable threat description  
    Given Service  
    And Taxonomy Feature  
    When A "<THREAT ACTOR>" requests/ enacts attack x  
    And Attack success criteria  
    Then MITRE ATT&CK Tactic - MITRE Technique Ref  
    And Loss of Service Taxonomy Feature C/I/A 
```

| Threat Actor |
| ---|
| Unprivileged Insider |
| Privileged Insider |
| Authenticated Internet based attacker with leaked credential |
| Unauthenticated Internet based attacker |

## Initial Access
### T1190 Exploit Public-Facing Application
```gherkin
Scenario: RDMS-T001 Vulnerable Internet facing RDMS instance exploited
    Given RDMS  
    And CCC-RDMS-1 SQL Support
    When An Unauthenticated Internet Based Attacker exploits a vulnerability in a internet facing RDMS instance with "<PAYLOAD>"
    And Response is "<RESPONSE>"
    Then Initial Access - T1190 Exploit Public-Facing Application
    And "<IMPACT>"
```

| PAYLOAD | RESPONSE | IMPACT |
| ---|---| ---|
| TBC | TBC | TBC| 

### T1078 Valid Accounts
```gherkin
Scenario: RDMS-T002 RDMS Credential Compromised
        Given RDMS
        And CCC-RDMS-1 SQL Support
        When An Internet Based attempts to execute "<QUERY>"
        And uses a leaked credential for authentication
        And the system returns and expected value: "<RESPONSE>"
        Then Initial Access - T1078 Valid Accounts
        And confidentiality, integrity and availability of the database is affected
```

# These are largely random at present, and should be refined further
Examples:
| QUERY                                    | RESPONSE   |
|----|----|
| SELECT name FROM employees LIMIT 1       | John Smith |
| SELECT age FROM employees WHERE id = 1   | 35         |
| SELECT COUNT(*) FROM orders              | 5          |
| SELECT product_name FROM products WHERE price > 50 LIMIT 1 | "Widget" |
| SELECT orders.order_id, customers.customer_name FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id | 1, "John Smith" |
| SELECT employees.employee_name, departments.department_name FROM employees LEFT JOIN departments ON employees.department_id = departments.department_id | "John Smith", "Sales" |
| SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department | "Sales", 50000 |
| SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department HAVING AVG(salary) > 50000 | "Sales", 60000 |
| SELECT product_name, price FROM products ORDER BY price DESC | "Widget", 100 |
| SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department ORDER BY employee_count DESC | "Sales", 3 |