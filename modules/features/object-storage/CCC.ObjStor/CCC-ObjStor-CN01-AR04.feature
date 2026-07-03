@CCC.ObjStor @CCC.ObjStor.CN01 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN01.AR04
  As a security administrator
  I want to prevent any requests to write to objects using untrusted KMS keys
  So that data encryption integrity and availability are protected against unauthorized encryption


  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    And "{result}" is not an error

@Behavioural
  Scenario: Service prevents writing object with read-only access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage" and "test-user-read"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{resource-name}", "test-write-object={timestamp}.txt", and "test content"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "read-create-object-error.txt"


@Behavioural
  Scenario: Service allows writing object with write access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage" and "test-user-write"
    And "{result}" is not an error
    And I attach "{result}" to the test output as "write-storage-service.json"
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateObject" using arguments "{resource-name}", "test-write-object={timestamp}.txt", and "test content"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "write-create-object-result.json"
