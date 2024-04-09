Feature: (CCC.OS.C1) - Deny unencrypted HTTP or prove encrypted HTTPS Requests Object Storage Buckets

Scenario: Test Control CCC.OS.C1 AWS
    GIVEN you own the object storage bucket in AWS
    WHEN an unencrypted HTTP request is made to the AWS bucket
    THEN the request should be denied 

Scenario: Test Control CCC.OS.C1 GCP
    GIVEN you own the object storage bucket in GCP
    WHEN an encrypted HTTPS request is made to the GCP bucket
    THEN the request should be encrypted