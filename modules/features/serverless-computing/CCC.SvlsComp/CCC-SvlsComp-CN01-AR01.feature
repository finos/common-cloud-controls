@CCC.SvlsComp @CCC.SvlsComp.CN01 @PerService @tlp-amber @tlp-red
Feature: CCC.SvlsComp.CN01.AR01 - Deny Public Internet Access
  As a security administrator
  I want serverless functions to be private-endpoint only
  So that they cannot be invoked directly from the public internet

  Background:
    Given a cloud api for "{Config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "serverless-computing"
    And I refer to "{result}" as "svc"

  @Behavioural @serverless-computing @SANITY @OPT_IN
  Scenario: Private invoke path succeeds
    When I call "{svc}" with "AttemptPrivateInvoke" using argument "{UID}"
    Then "{result}" is not an error
    And I refer to "{result}" as "privateInvoke"
    Then "{privateInvoke.Invoked}" is "true"

  @Behavioural @serverless-computing @MAIN
  Scenario: No public invoke surface is configured
    When I call "{svc}" with "GetInvokeEndpointExposure" using argument "{UID}"
    Then "{result}" is not an error
    And I refer to "{result}" as "exposure"
    And I attach "{exposure}" to the test output as "Invoke Endpoint Exposure"
    Then "{exposure.PublicEndpointConfigured}" is "false"

  @Behavioural @serverless-computing @MAIN @OPT_IN
  Scenario: Public internet invoke attempt is denied
    When I call "{svc}" with "AttemptPublicInternetInvoke" using argument "{UID}"
    Then "{result}" is not an error
    And I refer to "{result}" as "publicInvoke"
    And I attach "{publicInvoke}" to the test output as "Public Invoke Attempt"
    Then "{publicInvoke.AccessDenied}" is "true"
