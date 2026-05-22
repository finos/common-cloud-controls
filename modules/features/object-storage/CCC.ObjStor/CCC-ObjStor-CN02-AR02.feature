@CCC.ObjStor @CCC.ObjStor.CN02 @PerService @object-storage @tlp-amber @tlp-red
Feature: CCC.ObjStor.CN02.AR02 - Uniform Bucket-Level Access (Consistent Deny)
  When a permission set is denied for an object in a bucket,
  the service MUST deny the same permission set to access all objects in the same bucket.
  
  This ensures uniform bucket-level access is enforced, preventing ad-hoc object-level permissions.


  Background:
    Given a cloud api for "{Instance}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    And "{testUserNoAccess}" is not null

@Behavioural
  Scenario: Service enforces uniform bucket-level access denial
    When I call "{storage}" with "CreateObject" using arguments "{ResourceName}", "test-object={Timestamp}.txt", and "test data"
    Then "{result}" is not an error
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserNoAccess}", and "{false}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "ReadObject" using arguments "{ResourceName}" and "test-object={Timestamp}.txt"
    Then "{result}" is an error
    When I call "{storage}" with "SetObjectPermission" using arguments "{ResourceName}", "test-object={Timestamp}.txt", and "read"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "set-object-permission-error.txt"
    When I call "{userStorage}" with "ReadObject" using arguments "{ResourceName}" and "test-object={Timestamp}.txt"
    Then "{result}" is an error
