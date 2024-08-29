@CCC.RDMS.C8.TR01
Feature: Data encryption in transit

"""
This reature ensures that end-to-end encryption of data in transit is leveraged and enforced
"""

@CCC.RDMS.C8.TR01.T01
Scenario: Verify that databases are enforcing encrypted connections
   Given an application attempting to connect to a database and the database is configured with some form of "require secure transport"
   When the connection attempt is made without using encryption
   Then the connection should be refused

@CCC.RDMS.C8.TR01.T02
Scenario: Verify all connections to the database are established using secure connectionss
   Given a user connection has been established to the database
   When an admin follows vendor specific steps to audit connection details  
   Then there should be no connections observed using insecure connections
