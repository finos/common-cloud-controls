@CCC.ObjStor.C01.TR01
Feature: All supported network data protocols must be running on secure channels

"""
This feature ensures that all supported network data protocols are running on secure channels to protect data in transit.
"""

@CCC.ObjStor.C01.TR01.TE01
Scenario: Ensure HTTPS succeeds
   Given you own the object storage bucket
   When an encrypted HTTPS request is made to the bucket
   Then the request is allowed

@CCC.ObjStor.C01.TR01.TE02
Scenario: Ensure SFTP succeeds
   Given you own the object storage bucket
   When an encrypted SFTP request is made to the bucket
   Then the request is allowed

@CCC.ObjStor.C01.TR01.TE03
Scenario: Ensure gRPC over TLS succeeds
   Given you own the object storage bucket
   When an encrypted gRPC request is made to the bucket
   Then the request is allowed

---

@CCC.ObjStor.C01.TR02
Feature: All clear text channels should be disabled

"""
This feature ensures that all clear text channels are disabled to prevent unencrypted data transmission.
"""

@CCC.ObjStor.C01.TR02.TE01
Scenario: Ensure HTTP fails
   Given you own the object storage bucket
   When an HTTP request is made to the bucket
   Then the request is denied

@CCC.ObjStor.C01.TR02.TE02
Scenario: Ensure FTP fails
   Given you own the object storage bucket
   When an FTP request is made to the bucket
   Then the request is denied

@CCC.ObjStor.C01.TR02.TE03
Scenario: Ensure unencrypted gRPC fails
   Given you own the object storage bucket
   When an unencrypted gRPC request is made to the bucket
   Then the request is denied

---

@CCC.ObjStor.C01.TR03
Feature: The cipher suite implemented should conform with the latest suggested cipher suites

"""
This feature ensures that the cipher suite implemented for data encryption conforms with the latest suggested standards.
"""

@CCC.ObjStor.C01.TR03.TE01
Scenario: Ensure all known weak cipher suites are not supported
   Given you own the object storage bucket
   When a request with a weak cipher suite is made to the bucket
   Then the request must fail
