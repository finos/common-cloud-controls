@CCC.RDMS.C1.TR01
Feature: Role-based access control for database management system

"""
This feature verifies that access controls are in place to enforce role-based access, ensuring that only users with the appropriate roles can access the database management system.
"""

@CCC.RDMS.C1.TR01.T01
Scenario: Access for DatabaseAdmin
   Given a user with the role "DatabaseAdmin"
   When the user tries to access the database management system
   Then the user should be granted access to the database management system

@CCC.RDMS.C1.TR01.T02
Scenario: Access for DataAnalyst
   Given a user with the role "DataAnalyst"
   When the user tries to access the database management system
   Then the user should be granted access to the database management system

@CCC.RDMS.C1.TR01.T03
Scenario: Access for Guest
   Given a user with the role "Guest"
   When the user tries to access the database management system
   Then the user should be denied access to the database management system

@CCC.RDMS.C1.TR02
Feature: Restrict access to database resources based on role definitions

"""
This feature ensures that access to database resources is restricted based on role definitions, allowing only authorized roles to access specific resources.
"""

@CCC.RDMS.C1.TR02.T01
Scenario: Access to sensitive resources for DatabaseAdmin
   Given a user with the role "DatabaseAdmin"
   When the user tries to access sensitive database resources
   Then the user should be granted access to sensitive database resources

@CCC.RDMS.C1.TR02.T02
Scenario: Access to sensitive resources for DataAnalyst
   Given a user with the role "DataAnalyst"
   When the user tries to access sensitive database resources
   Then the user should be denied access to sensitive database resources

@CCC.RDMS.C1.TR02.T03
Scenario: Access to analytical resources for DataAnalyst
   Given a user with the role "DataAnalyst"
   When the user tries to access analytical database resources
   Then the user should be granted access to analytical database resources

@CCC.RDMS.C1.TR03
Feature: Prevent unauthorized access to database resources

"""
This feature verifies that unauthorized roles cannot access database resources, ensuring that only users with appropriate roles have the necessary permissions.
"""

@CCC.RDMS.C1.TR03.T01
Scenario: Access for Guest
   Given a user with the role "Guest"
   When the user tries to access any database resources
   Then the user should be denied access to all database resources

@CCC.RDMS.C1.TR03.T02
Scenario: Access to admin-level resources for DataAnalyst
   Given a user with the role "DataAnalyst"
   When the user tries to access admin-level database resources
   Then the user should be denied access to admin-level database resources

@CCC.RDMS.C1.TR03.T03
Scenario: Access to analytical resources for DatabaseAdmin
   Given a user with the role "DatabaseAdmin"
   When the user tries to access analytical database resources
   Then the user should be granted access to analytical database resources
