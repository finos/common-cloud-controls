Feature: (CCC.OS.C3) - Prevent the granting of direct public access to the object storage bucket you own

Scenario: Test Control CCC.OS.C3
    GIVEN you own the object storage bucket in AWS
    AND you own the object storage bucket in GCP
    WHEN the access controls on the bucket are updated to grant public access to the AWS bucket
    AND the access controls on the bucket are updated to grant public access to the GCP bucket
    THEN the request should be denied