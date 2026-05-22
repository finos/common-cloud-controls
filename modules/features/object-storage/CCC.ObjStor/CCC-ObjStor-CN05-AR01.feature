@CCC.ObjStor @CCC.ObjStor.CN05 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN05.AR01 - Versioning with Unique Identifiers
  As a security administrator
  I want to ensure objects are stored with unique identifiers
  So that version tracking is enabled


  Background:
    Given a cloud api for "{Instance}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Service enables versioning and objects receive unique version identifiers
    When I call "{storage}" with "IsBucketVersioningEnabled" using argument "{ResourceName}"
    Then "{result}" is true
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "versioned-object.txt", and "test content"
    And I refer to "{result}" as "createdObject"
    Then "{createdObject.VersionID}" is not empty
    And I attach "{result}" to the test output as "versioned-object.json"
