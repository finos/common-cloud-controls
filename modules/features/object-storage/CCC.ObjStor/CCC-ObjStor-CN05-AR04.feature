@CCC.ObjStor @CCC.ObjStor.CN05 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN05.AR04 - Retain Versions on Delete
  As a security administrator
  I want to ensure object versions are retained when objects are deleted
  So that deleted data can be recovered


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Deleted object data can be reloaded from previous version
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "recover-deleted-object={Timestamp}.txt", and "data to retain"
    And I refer to "{result.VersionID}" as "retainedVersionId"
    When I call "{storage}" with "DeleteObject" using arguments "{ResourceName}" and "recover-deleted-object={Timestamp}.txt"
    When I call "{storage}" with "ReadObjectAtVersion" using arguments "{ResourceName}", "recover-deleted-object={Timestamp}.txt", and "{retainedVersionId}"
    Then "{result.Data}" contains "data to retain"
    And I attach "{result}" to the test output as "recovered-deleted-version.json"


@Behavioural
  Scenario: Deleted object version remains in version list
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "list-deleted-versions-object={Timestamp}.txt", and "versioned data"
    And I refer to "{result.VersionID}" as "listedVersionId"
    When I call "{storage}" with "DeleteObject" using arguments "{ResourceName}" and "list-deleted-versions-object={Timestamp}.txt"
    When I call "{storage}" with "ListObjectVersions" using arguments "{ResourceName}" and "list-deleted-versions-object={Timestamp}.txt"
    And "{result}" is an array of objects with at least the following contents
      | VersionID       | ObjectID                             |
      | {listedVersionId} | list-deleted-versions-object={Timestamp}.txt |
    And I attach "{result}" to the test output as "versions-after-delete.json"
