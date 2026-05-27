@CCC.Core @CCC.Core.CN06 @PerService @tlp-amber @tlp-green @tlp-red
Feature: CCC.Core.CN06.AR01 - Resource Location Compliance
  As a security administrator
  I want to ensure cloud resources are deployed in approved regions
  So that data residency and sovereignty requirements are met

  Background:
    Given a cloud api for "{Config}" in "api"

  @Behavioural @object-storage @vpc @virtual-machines @serverless-computing
  Scenario: Resource region can be retrieved for compliance verification
    Given I call "{api}" with "GetServiceAPI" using argument "{ServiceType}"
    And I refer to "{result}" as "theService"
    When I call "{theService}" with "GetResourceRegion" using argument "{ResourceName}"
    Then "{result}" is not an error
    And I refer to "{result}" as "region"
    And I attach "{region}" to the test output as "Resource Region"
    Then "{PermittedRegions}" is an array of objects with at least the following contents
      | value    |
      | {region} |
