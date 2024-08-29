@CCC.RDMS.C4.TR01
Feature: Enable logging for database activities

"""
This feature ensures that logging is enabled for all database activities to maintain auditability and traceability of actions performed on the database.
"""

@CCC.RDMS.C4.TR01.T01
Scenario: Verify that logging is enabled for all database activities
   Given the database management system is configured
   When the logging settings are checked
   Then logging should be enabled for all database activities

@CCC.RDMS.C4.TR02
Feature: Active monitoring of database resources

"""
This feature ensures that monitoring is active for all database resources to facilitate real-time observation and management of database health and performance.
"""

@CCC.RDMS.C4.TR02.T01
Scenario: Ensure that monitoring is active for all database resources
   Given the database management system is configured
   When the monitoring settings are checked
   Then monitoring should be active for all database resources

@CCC.RDMS.C4.TR03
Feature: Restrict users from disabling logging and monitoring

"""
This feature ensures that users, even with administrative roles, are restricted from disabling logging and monitoring to maintain security and compliance.
"""

@CCC.RDMS.C4.TR03.T01
Scenario: Confirm that users cannot disable logging and monitoring
   Given a user with the role "DatabaseAdmin"
   When the user tries to disable logging
   Then the user should be denied the ability to disable logging

@CCC.RDMS.C4.TR03.T02
Scenario: Confirm that users cannot disable logging and monitoring
   Given a user with the role "DatabaseAdmin"
   When the user tries to disable monitoring
   Then the user should be denied the ability to disable monitoring
