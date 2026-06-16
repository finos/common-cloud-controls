@CCC.ObjStor @CCC.ObjStor.CN05 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN05.AR03 - Recovery of Previous Versions
  As a security administrator
  I want to ensure previous object versions can be recovered
  So that data can be restored after modifications


  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Modified objects receive new version identifiers
    When I call "{storage}" with "CreateObject" using arguments "{resource-name}", "version-test-object={timestamp}.txt", and "original content"
    And I refer to "{result.VersionID}" as "version1"
    And I call "{storage}" with "CreateObject" using arguments "{resource-name}", "version-test-object={timestamp}.txt", and "modified content"
    And I refer to "{result.VersionID}" as "version2"
    And I call "{storage}" with "ReadObjectAtVersion" using arguments "{resource-name}", "version-test-object={timestamp}.txt", and "{version1}"
    And I attach "{result}" to the test output as "original-content.json"
    Then "{result.Data}" contains "original content"
    When I call "{storage}" with "ReadObjectAtVersion" using arguments "{resource-name}", "version-test-object={timestamp}.txt", and "{version2}"
    Then "{result.Data}" contains "modified content"
    And I attach "{result}" to the test output as "modified-content.json"
