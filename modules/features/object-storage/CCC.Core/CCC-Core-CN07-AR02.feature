@CCC.Core @CCC.Core.CN07 @PerService @tlp-amber @tlp-clear @tlp-green @tlp-red
Feature: CCC.Core.CN07.AR02 - Log Enumeration Activities
  As a security administrator
  I want to ensure enumeration activities are logged
  So that reconnaissance attempts can be investigated


  Background:
    Given a cloud api for "{Instance}" in "api"

@Behavioural @NotTestable @object-storage
  Scenario: Enumeration logging cannot be verified automatically
    # Verifying enumeration activities are logged requires performing operations
    # and querying cloud audit logs - cross-service integration (object-storage +
    # logging) and log retrieval timing make full automation complex.
    #
    # Manual verification steps:
    # 1. Perform enumeration activity (e.g., ListBuckets, ListObjects)
    # 2. Query cloud audit logs for corresponding entries
    # 3. Confirm log entries contain required fields for investigation
    Then no-op required
