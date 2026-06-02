@CCC.ObjStor @CCC.ObjStor.CN01 @PerService @object-storage @tlp-amber @tlp-red
Feature: CCC.ObjStor.CN01.AR02
  As a security administrator
  I want to prevent any requests to read protected objects using untrusted KMS keys
  So that data encryption integrity and availability are protected against unauthorized encryption


  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    And I call "{storage}" with "CreateObject" using arguments "{resource-name}", "test-object={timestamp}.txt", and "test content"
    And "{result}" is not an error

@Behavioural
  Scenario: Service prevents reading object with no access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "test-user-no-access", and "{false}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "ReadObject" using arguments "{resource-name}" and "test-object={timestamp}.txt"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "no-access-read-object-error.txt"


@Behavioural
  Scenario: Service allows reading object with read access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "test-user-read", and "{true}"
    And "{result}" is not an error
    And I attach "{result}" to the test output as "read-storage-service.json"
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "ReadObject" using arguments "{resource-name}" and "test-object={timestamp}.txt"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "read-read-object-result.json"
