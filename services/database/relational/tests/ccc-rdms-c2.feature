@CCC.RDMS.C2
Feature: Database Security Measures

"""
This feature verifies various security measures in the database management system, including disabling default credentials, ensuring only authorized roles have access, and denying access attempts using default credentials.
"""

@CCC.RDMS.C2.TR01
Scenario: Verify that default credentials are disabled
   Given the database management system is configured
   When the default credentials are checked
   Then the default credentials should be disabled

@CCC.RDMS.C2.TR02.T01
Scenario: Ensure that only authorized roles can access database resources
   Given a user with an authorized role
   When the user tries to access the database resources
   Then the user should be granted access to the database resources

@CCC.RDMS.C2.TR02.T02
Scenario: Ensure that unauthorized roles cannot access database resources
   Given a user with an unauthorized role
   When the user tries to access the database resources
   Then the user should be denied access to the database resources

@CCC.RDMS.C2.TR03
Scenario: Confirm that access attempts using default credentials are denied
   Given the database management system has default credentials
   When an access attempt is made using default credentials
   Then the access attempt should be denied
