@CCC.Core @CCC.Core.CN08 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN08.AR02 - Replication Status Visibility
  As a security administrator
  I want to ensure replication status is accurately represented
  So that data synchronization can be monitored


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural @object-storage
  Scenario: Replication status can be retrieved for monitoring
    When I call "{storage}" with "GetReplicationStatus" using argument "{ResourceName}"
    And I refer to "{result}" as "replicationStatus"
    And I attach "{replicationStatus}" to the test output as "Replication Status"
    And I refer to "{replicationStatus.Locations}" as "locations"
    Then "{locations}" is an array of objects with at least the following contents
      | value   |
      | {ReplicationLocations[0]}  |
      | {ReplicationLocations[1]}  |
