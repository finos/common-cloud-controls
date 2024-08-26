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
Scenario: Ensure ability to audit for any users who have connected using an insecure protocol
   Given a user connection has been established to the database
   When an admin establishes an admin connection to a database server and runs from mysql.user where ssl_type=''
   Then no users should be returned
