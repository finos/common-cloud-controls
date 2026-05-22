@CCC.ObjStor @CCC.ObjStor.CN01 @PerService @object-storage @tlp-amber @tlp-red
Feature: CCC.ObjStor.CN01.AR01
  As a security administrator
  I want to prevent any requests to read protected buckets using untrusted KMS keys
  So that data encryption integrity and availability are protected against unauthorized encryption


  Background:
    Given a cloud api for "{Instance}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    # Pre-provisioned identities must be supplied in Props by the test runner (e.g. testUserNoAccess, testUserRead).
    And "{testUserNoAccess}" is not null
    And "{testUserRead}" is not null

@Behavioural
  Scenario: Service prevents reading bucket with no access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserNoAccess}", and "{false}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "ListObjects" using argument "{ResourceName}"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "no-access-list-error.txt"


@Behavioural
  Scenario: Service allows reading bucket with read access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserRead}", and "{true}"
    And "{result}" is not an error
    And I attach "{result}" to the test output as "read-storage-service.json"
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "ListObjects" using argument "{ResourceName}"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "read-list-objects-result.json"
