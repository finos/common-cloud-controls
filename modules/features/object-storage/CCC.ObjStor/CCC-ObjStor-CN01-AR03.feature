@CCC.ObjStor @CCC.ObjStor.CN01 @PerService @object-storage @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.ObjStor.CN01.AR03
  As a security administrator
  I want to prevent any requests to create buckets using untrusted KMS keys
  So that data encryption integrity and availability are protected against unauthorized encryption


  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Service prevents creating bucket with no access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", and "test-user-no-access"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateBucket" using argument "test-bucket-no-access"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "no-access-create-bucket-error.txt"


@Behavioural
  Scenario: Service allows creating bucket with write access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", and "test-user-write"
    And "{result}" is not an error
    And I attach "{result}" to the test output as "write-storage-service.json"
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateBucket" using argument "test-bucket-write"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "write-create-bucket-result.json"
    And I call "{storage}" with "DeleteBucket" using argument "{result.ID}"
