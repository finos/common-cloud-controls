@CCC.ObjStor @CCC.ObjStor.CN05 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN05.AR02 - New Version ID on Modification
  As a security administrator
  I want to ensure modified objects receive new version identifiers
  So that changes are tracked


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Modified objects receive new version identifiers
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "version-test-object={Timestamp}.txt", and "original content"
    And I refer to "{result.VersionID}" as "version1"
    And I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "version-test-object={Timestamp}.txt", and "modified content"
    And I refer to "{result.VersionID}" as "version2"
    Then "{version1}" is not equal to "{version2}"
