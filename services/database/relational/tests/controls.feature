# Common Cloud Controls RDMS Controls - Feature

@CCC.RDMS.C1
Feature: Enforce Role-Based Access Control
  Scenario: Deny database access to untrusted roles
    GIVEN a user attempts to access the database
    WHEN they attempt to connect using an untrusted role
    THEN deny access

@CCC.RDMS.C2
Feature: Disable Access with Default Credentials
  Scenario: Deny database access using default credentials
    GIVEN a user attempts to access the database
    WHEN they initiate connection with default credentials
    THEN deny access

@CCC.RDMS.C3
Feature: Restrict Snapshot Collection To Trusted Roles
  Scenario: Deny snapshot collection from non-trusted roles
    GIVEN a snapshot collection request
    WHEN the requestor is outside of trusted roles
    THEN deny the request

@CCC.RDMS.C4
Feature: Restrict Snapshot Collection to Trusted Organization
  Scenario: Deny exporting snapshots to untrusted organizations
    GIVEN a snapshot export request
    WHEN the request attempts to copy the snapshot to an untrusted organization
    THEN deny the request

@CCC.RDMS.C5
Feature: Enforce Logging & Monitoring
  Scenario: Deny requests to disable logging
    GIVEN a request to disable logging
    WHEN it originates from a malicious role
    THEN deny the request

@CCC.RDMS.C6
Feature: Deny Unencrypted Connections
  Scenario: Deny unencrypted database connections
    GIVEN a database connection request
    WHEN it is not using SSL/TLS
    THEN deny the request

@CCC.RDMS.C7
Feature: Validate Encryption Keys for Database Snapshots
  Scenario: Verify the validity of encryption keys during snapshot creation
    GIVEN a snapshot creation attempt
    WHEN using a non-default encryption key
    THEN verify the key’s validity
