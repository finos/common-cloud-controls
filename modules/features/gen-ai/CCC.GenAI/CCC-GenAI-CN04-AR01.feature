@CCC.GenAI @CCC.GenAI.CN04 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN04.AR01 - Validate Ingested Data
  As a security administrator
  I want ingested training and RAG data validated
  So that poison or sensitive content is not embedded

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @MAIN @OPT_IN
  Scenario: Poison document ingest is rejected
    When I call "{svc}" with "IngestDocument" using arguments "{kb-id}", "{approved-source-id}", and "{ingest-poison-document-id}"
    Then "{result}" is an error
