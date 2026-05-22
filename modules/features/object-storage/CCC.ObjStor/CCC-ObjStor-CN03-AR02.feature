@CCC.ObjStor @CCC.ObjStor.CN03 @PerService @object-storage @tlp-amber @tlp-red
Feature: CCC.ObjStor.CN03.AR02 - Immutable Bucket Retention Policy
  When an attempt is made to modify the retention policy for an object storage bucket,
  the service MUST prevent the policy from being modified.
  
  This ensures retention policies cannot be shortened or removed, protecting against data loss.


  Background:
    Given a cloud api for "{Instance}" in "api"
    And I call "{api}" with "GetServiceAPI" using argument "object-storage"
    And I refer to "{result}" as "storage"

@Behavioural
  Scenario: Service prevents modification of locked retention policy
    When I call "{storage}" with "GetBucketRetentionDurationDays" using argument "{ResourceName}"
    Then "{result}" is not an error
    And I refer to "{result}" as "originalRetention"
    And I attach "{result}" to the test output as "original-retention-days.txt"
    And "{result}" should be greater than "0"
    When I call "{storage}" with "SetBucketRetentionDurationDays" using arguments "{ResourceName}" and "1"
    Then "{result}" is an error
    And I attach "{result}" to the test output as "set-retention-error.txt"
    When I call "{storage}" with "GetBucketRetentionDurationDays" using argument "{ResourceName}"
    Then "{result}" is not an error
    And "{result}" should equal "{originalRetention}"
