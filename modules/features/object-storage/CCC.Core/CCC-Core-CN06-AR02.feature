@CCC.Core @CCC.Core.CN06 @PerService @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.Core.CN06.AR02 - Child Resource Location Compliance
  As a security administrator
  I want to ensure child resources are deployed in approved regions
  So that data residency requirements are met for all resources


  Background:
    Given a cloud api for "{Instance}" in "api"

@Behavioural @NotTestable @object-storage
  Scenario: Child resource region compliance
    # Child resources (e.g., objects in a bucket) inherit region from parent.
    Then no-op required
