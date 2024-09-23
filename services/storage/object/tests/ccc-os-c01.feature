@CCC.OS.C01.TR01
Feature: Verify that access policies for cloud storage buckets and objects prevent requests with untrusted KMS keys

"""
This feature ensures that cloud storage buckets and objects are protected by access policies that block any requests using untrusted Key Management Service (KMS) keys. An untrusted KMS key is defined as any key not specified as trusted by the cloud storage bucket owner.
"""

@CCC.OS.C01.TR01.T01
Scenario: Prevent access requests with untrusted KMS keys
   Given a cloud storage bucket with an access policy
   And the bucket owner has specified a list of trusted KMS keys
   When a request is made to access the bucket or its objects using a KMS key not in the trusted list
   Then the access request is denied