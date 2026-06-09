@CCC.GenAI @CCC.GenAI.CN03 @PerService @tlp-clear @tlp-green @tlp-amber @tlp-red
Feature: CCC.GenAI.CN03.AR02 - No Unvetted Sources in Production
  As a security administrator
  I want production knowledge bases to reject unvetted sources
  So that only approved data origins are indexed

  Background:
    Given a cloud api for "{config}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "gen-ai"
    And I refer to "{result}" as "svc"

  @Behavioural @gen-ai @MAIN
  Scenario: Ingest from unvetted source is denied
    When I call "{svc}" with "IngestDocument" using arguments "{kb-id}", "{unvetted-source-id}", and "integration-probe-doc"
    Then "{result}" is an error

  @Behavioural @gen-ai @SANITY
  Scenario: Configured knowledge base sources are allowlisted
    When I call "{svc}" with "GetKnowledgeBaseSources" using argument "{kb-id}"
    Then "{result}" is not an error
    And I attach "{result}" to the test output as "Knowledge base sources"

  @Behavioural @gen-ai @SANITY @OPT_IN
  Scenario: Ingest from approved source is accepted
    When I call "{svc}" with "IngestDocument" using arguments "{kb-id}", "{approved-source-id}", and "clean-probe-doc"
    Then "{result}" is not an error
    And I refer to "{result}" as "ingestResult"
    Then "{ingestResult.Action}" is "indexed"
