@CCC.RDMS.C3.TR01
Feature: Snapshot collection by trusted roles

"""
This feature ensures that only users with trusted roles are allowed to perform snapshot collection on the database to maintain security and prevent unauthorized access.
"""

@CCC.RDMS.C3.TR01.T01
Scenario: Verify that only trusted roles can perform snapshot collection
   Given a user with the role "TrustedRole"
   When the user tries to collect a snapshot
   Then the user should be granted permission to collect a snapshot

@CCC.RDMS.C3.TR02
Feature: Restriction of snapshot collection capabilities

"""
This feature ensures that snapshot collection capabilities are restricted to users with trusted roles, preventing unauthorized users from performing this action.
"""

@CCC.RDMS.C3.TR02.T01
Scenario: Ensure that snapshot collection capabilities are restricted to trusted roles
   Given a user with the role "TrustedRole"
   When the user tries to collect a snapshot
   Then the user should be granted permission to collect a snapshot

@CCC.RDMS.C3.TR02.T02
Scenario: Ensure that snapshot collection capabilities are restricted to trusted roles
   Given a user with the role "UntrustedRole"
   When the user tries to collect a snapshot
   Then the user should be denied permission to collect a snapshot

@CCC.RDMS.C3.TR03
Feature: Prevent unauthorized snapshot collection

"""
This feature ensures that users with unauthorized roles are prevented from collecting snapshots, maintaining the security and integrity of the database.
"""

@CCC.RDMS.C3.TR03.T01
Scenario: Confirm that unauthorized roles cannot collect snapshots
   Given a user with the role "UnauthorizedRole"
   When the user tries to collect a snapshot
   Then the user should be denied permission to collect a snapshot
