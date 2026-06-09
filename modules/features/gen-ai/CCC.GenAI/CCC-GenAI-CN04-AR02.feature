@CCC.GenAI @CCC.GenAI.CN04 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN04.AR02 - Reject, Redact, or Flag on Ingest Violation
  As a security administrator
  I want ingest violations rejected, redacted, or flagged
  So that malicious content is not silently indexed

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @MAIN @OPT_IN
  Scenario: Poison ingest result is not silently indexed
    When I call "{svc}" with "IngestDocument" using arguments "{kb-id}", "{approved-source-id}", and "{ingest-poison-document-id}"
    Then "{result}" is an error
