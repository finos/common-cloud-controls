@CCC.RDMS.C2.TR01
Feature: Secure Database Access Control

"""
This feature verifies various security measures in the database management system, including disabling default credentials, ensuring only authorized roles have access, and denying access attempts using default credentials.
"""

@CCC.RDMS.C2.TR01.TE01
Scenario: Ensure that only authorized roles can access database resources
   Given a user with an authorized role
   When the user tries to access the database resources
   Then the user should be granted access to the database resources

@CCC.RDMS.C2.TR01.TE02
Scenario: Ensure that unauthorized roles cannot access database resources
   Given a user with an unauthorized role
   When the user tries to access the database resources
   Then the user should be denied access to the database resources

@CCC.RDMS.C2.TR01.TR03
Scenario: Confirm that access attempts using default credentials are denied
   Given the database management system has default credentials
   When an access attempt is made using default credentials
   Then the access attempt should be denied


@CCC.RDMS.C2.TR02
Feature: Secure Database Access Control with Local users

"""
This feature targets database configurations where a local user is defined and granted permissions to interact with the database system.  
"""

@CCC.RDMS.C2.TR02.TR01
Scenario: Ensure that only authorized local accounts exist in the database and are restricted to accessing the data they need
   Given a local database with user accounts that may be used for application access
   When auditing local accounts 
   Then only expected local accounts exist in the database
   And each account is properly scoped to the expected permissions

@CCC.RDMS.C2.TR02.TR02
Scenario: Ensure that authorized accounts only have the minimum neccessary permissions to perform their task
   Given that local accounts must be granted certain permissions to perform certain operations on the database system
   When auditing local account permissions
   Then the permissions are the minimum needed to local account to perform necessary operations
