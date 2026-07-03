@CCC.Core @CCC.Core.CN12 @PerService @tlp-amber @tlp-red
Feature: CCC.Core.CN12.AR01 - Deny Unauthorized IP Connection
  As a security administrator
  I want to ensure unauthorized network sources cannot connect to VMs
  So that services are protected at the network boundary

  Background:
    Given a cloud api for "{config}" in "api"

  @Behavioural @virtual-machines
  Scenario: Unauthorized inbound connection attempt is denied
    Given I call "{api}" with "GetServiceAPI" using argument "virtual-machines"
    And I refer to "{result}" as "vmService"
    When I call "{vmService}" with "AttemptInboundConnection" using arguments "{uid}" and "{test-listener-port}"
    Then "{result}" is not an error
    And I refer to "{result}" as "probe"
    And I attach "{probe}" to the test output as "Inbound Connection Probe"
    Then "{probe.Connected}" is "false"
