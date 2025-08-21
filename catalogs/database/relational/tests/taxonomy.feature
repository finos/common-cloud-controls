# Common Cloud Controls RDMS Taxonomy Feature
@CCC-RDMS-Taxonomy
Feature: Relational Database Management System Taxonomy
    As a decision-maker or regulator for a financial services organization
    I want to ensure that an RDMS system contains the minimum capabilities required for the service to be portable with other RDMS systems
    So that I can ensure that the system is not locked into a single vendor

    Background:
        Given a RDMS system is reachable from a known endpoint
        And credentials have been supplied with sufficient permissions to create a new table and user

    @CCC-RDMS-1
    Scenario: Ensure the system supports properly handles queries in the SQL language
        When test data has been inserted to the table successfully
        And the following query is executed: "<QUERY>"
        Then the system returns an expected value: "<RESPONSE>"

    # These are largely random at present, and should be refined further
    Examples:
        | QUERY                                    | RESPONSE   |
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

    @CCC-RDMS-2
    Scenario: Ensure the system supports vertical scaling
        When the system is scaled vertically to "<SIZE>" of the original value
        Then the changes can be verified in the system

    Examples:
        | SIZE |
        | 2x   |
        | 8x   |
        | 4x   |
        | 1x   |

    @CCC-RDMS-3
    Scenario: Ensure the system supports horizontal scaling via read replicas
        When a read replica is created in the same region as the primary database
        And data is inserted into the primary database
        Then the data can be found in the read replica
    
    @CCC-RDMS-4
    Scenario: Ensure the system supports horizontal scaling via read replicas in multiple regions
        When a read replica exists in a different region from the primary database
        And data is inserted into the primary database
        Then the data can be found in the read replica

    @CCC-RDMS-5
    Scenario: Ensure the system supports automated backups
        When automated backups are enabled
        Then the system creates a backup at the specified interval
        And the backup can be found in the expected location

    @CCC-RDMS-6
    Scenario: Ensure the system supports point in time recovery
        When a backup is restored to a specific point in time
        Then the system returns the expected value

    @CCC-RDMS-7
    Scenario: Ensure the system supports encryption at rest
        When encryption at rest is enabled
        Then the system returns the expected value
    
    @CCC-RDMS-8
    Scenario: Ensure the system supports encryption in transit
        When encryption in transit is enabled
        Then the system returns the expected value
    
    @CCC-RDMS-9
    Scenario: Ensure the system supports role based access control
        When a new user is created with the following permissions: "<PERMISSIONS>"
        Then the user can perform the following actions: "<ALLOWED>"
        And the user cannot perform the following actions: "<DENIED>"

    Examples:
        | PERMISSIONS | ALLOWED | DENIED |
        | SELECT         | SELECT  | INSERT, UPDATE, DELETE |
        | SELECT, INSERT | SELECT, INSERT | UPDATE, DELETE |
        | SELECT, INSERT, UPDATE | SELECT, INSERT, UPDATE | DELETE |
        | SELECT, INSERT, UPDATE, DELETE | SELECT, INSERT, UPDATE, DELETE | |

    @CCC-RDMS-10
    Scenario: Ensure the system supports logging
        When logging is enabled
        Then the system returns the expected value

    @CCC-RDMS-11
    Scenario: Ensure the system supports monitoring
        When monitoring is enabled
        Then the system returns the expected value
    
    @CCC-RDMS-12
    Scenario: Ensure the system supports alerting
        When alerting is enabled
        Then the system returns the expected value
    
    @CCC-RDMS-13
    Scenario: Ensure the system can support failover
        When the system has a standby database configured
        And the primary database has become unreachable
        Then the system should use the standby system instead
