Feature: (CCC.OS.C3) - Prevent the granting of direct public access to the object storage bucket you own

Scenario: Test Control CCC.OS.C3 - AWS
    GIVEN you own the object storage bucket in AWS
    WHEN the access controls on the bucket are updated to grant public access to the AWS bucket
    THEN the request should be denied