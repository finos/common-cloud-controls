@CCC.Core @CCC.Core.CN05 @PerService @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.Core.CN05.AR02 - Block Unauthorized Administrative Access
  As a security administrator
  I want to ensure unauthorized entities cannot perform administrative actions
  So that service configuration is protected


  Background:
    Given a cloud api for "{Instance}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"
    # Pre-provisioned identities must be supplied in Props by the test runner.
    And "{testUserNoAccess}" is not null
    And "{testUserRead}" is not null
    And "{testUserAdmin}" is not null

@Destructive @Behavioural @object-storage
  Scenario: Service prevents administrative action (creating a new bucket) by user with no access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserNoAccess}", and "{false}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateBucket" using argument "test-cn05-unauthorized-admin-container"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "no-admin-create-bucket-error.txt"


@Destructive @Behavioural @object-storage
  Scenario: Service prevents administrative action (creating a new bucket) by user with read-only access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserRead}", and "{false}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateBucket" using argument "test-cn05-read-only-create-container"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "read-only-create-bucket-error.txt"


@Behavioural @object-storage
  Scenario: Service allows administrative action (creating a new bucket) by user with admin access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "object-storage", "{testUserAdmin}", and "{true}"
    And "{result}" is not an error
    And I refer to "{result}" as "userStorage"
    When I call "{userStorage}" with "CreateBucket" using argument "test-cn05-authorized-admin-container"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "admin-create-bucket-result.json"
    And I call "{storage}" with "DeleteBucket" using argument "test-cn05-authorized-admin-container"
