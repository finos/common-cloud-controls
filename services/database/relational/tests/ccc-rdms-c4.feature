@CCC.RDMS.C4
Feature: Logging and monitoring for database activities

"""
This feature ensures that logging is enabled for all database activities, monitoring is active for all database resources, and users cannot disable logging and monitoring.
"""

@CCC.RDMS.C4.TR01
Scenario: Verify that logging is enabled for all database activities
   Given the database management system is configured
   When the logging settings are checked
   Then logging should be enabled for all database activities

@CCC.RDMS.C4.TR02
Scenario: Ensure that monitoring is active for all database resources
   Given the database management system is configured
   When the monitoring settings are checked
   Then monitoring should be active for all database resources

@CCC.RDMS.C4.TR03
Scenario: Confirm that users cannot disable logging and monitoring
   Given a user with the role "DatabaseAdmin"
   When the user tries to disable logging
   Then the user should be denied the ability to disable logging

   Given a user with the role "DatabaseAdmin"
   When the user tries to disable monitoring
   Then the user should be denied the ability to disable monitoring
