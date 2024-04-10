Feature: (CCC.OS.C2) - Prevent object storage data encrypted for impact

Scenario: Test Control CCC.OS.C2 AWS
    GIVEN you own the object storage bucket in AWS
    WHEN a data plane request with an untrusted KMS key is made to the object storage bucket
    THEN the request should be denied 