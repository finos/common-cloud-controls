@CCC.Core @CCC.Core.CN05 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN05.AR06 - Block All Unauthorized Requests
  As a security administrator
  I want to ensure all unauthorized requests are blocked
  So that the principle of least privilege is enforced


  Background:
    Given a cloud api for "{config}" in "api"

@Destructive @Behavioural @object-storage @virtual-machines @serverless-computing @gen-ai
  Scenario: Service prevents data read by user with no access
    And I call "{api}" with "GetServiceAPIWithIdentity" using arguments "{service-type}" and "test-user-no-access"
    And "{result}" is not an error
    And I refer to "{result}" as "userReadableService"
    When I call "{userReadableService}" with "TriggerDataRead" using argument "{resource-name}"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "no-access-trigger-data-read-error.txt"
