Feature: (CCC.OS.C2) - Prevent object storage data encrypted for impact

Scenario: Test Control CCC.OS.C2
    GIVEN you own the object storage bucket in AWS
    AND you own the object storage bucket in GCP
    WHEN a data plane request with an untrusted KMS key is made to the AWS object storage bucket
    AND a data plane request with an untrusted KMS key is made to the GCP object storage bucket
    THEN the AWS request should be denied
    AND the GCP storage object should have been deleted