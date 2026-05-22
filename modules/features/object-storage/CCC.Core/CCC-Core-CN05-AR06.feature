@CCC.Core @CCC.Core.CN05 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN05.AR06 - Block All Unauthorized Requests
  As a security administrator
  I want to ensure all unauthorized requests are blocked
  So that the principle of least privilege is enforced


  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Destructive @Behavioural @Duplicate @object-storage
  Scenario: Service prevents data read by user with no access
    # This test already covered by CCC.ObjStor.CN01.AR01
    Then no-op required
