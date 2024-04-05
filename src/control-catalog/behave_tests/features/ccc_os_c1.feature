Feature: Test CCC.OS.C1
Scenario: Test CCC.OS.C1
    GIVEN you own the object storage bucket
    WHEN an unencrypted HTTP request is made to the bucket
    THEN the request should be denied 