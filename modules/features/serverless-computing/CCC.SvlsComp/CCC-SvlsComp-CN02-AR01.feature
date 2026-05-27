@CCC.SvlsComp @CCC.SvlsComp.CN02 @PerService @tlp-amber @tlp-red
Feature: CCC.SvlsComp.CN02.AR01 - Function Invocation Rate Limits
  As a security administrator
  I want function invocation rate limits to be enforced
  So that burst abuse is throttled predictably

  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "serverless-computing"
    And I refer to "{result}" as "svc"

  @Behavioural @Destructive @serverless-computing
  Scenario: Invocations beyond threshold are throttled
    When I call "{svc}" with "InvokeFunctionBurst" using arguments "{UID}" and "{rate-limit-threshold}"
    Then "{result}" is not an error
    And I refer to "{result}" as "withinThreshold"
    Then "{withinThreshold.AllSucceeded}" is "true"
    When I call "{svc}" with "InvokeFunctionBurst" using arguments "{UID}" and "{burst-overrun}"
    Then "{result}" is not an error
    And I refer to "{result}" as "overrun"
    And I attach "{overrun}" to the test output as "Invocation Burst Overrun"
    Then "{overrun.ThrottledCount}" is greater than "{0}"
