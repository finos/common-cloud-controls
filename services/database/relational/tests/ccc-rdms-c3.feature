@CCC.RDMS.C3
Feature: Snapshot collection access control

"""
This feature verifies that only trusted roles can perform snapshot collection in the database management system, and that unauthorized roles are restricted from this capability.
"""

@CCC.RDMS.C3.TR01
Scenario: Verify that only trusted roles can perform snapshot collection
   Given a user with the role "TrustedRole"
   When the user tries to collect a snapshot
   Then the user should be granted permission to collect a snapshot

@CCC.RDMS.C3.TR02
Scenario: Ensure that snapshot collection capabilities are restricted to trusted roles
   Given a user with the role "TrustedRole"
   When the user tries to collect a snapshot
   Then the user should be granted permission to collect a snapshot

   Given a user with the role "UntrustedRole"
   When the user tries to collect a snapshot
   Then the user should be denied permission to collect a snapshot

@CCC.RDMS.C3.TR03
Scenario: Confirm that unauthorized roles cannot collect snapshots
   Given a user with the role "UnauthorizedRole"
   When the user tries to collect a snapshot
   Then the user should be denied permission to collect a snapshot
