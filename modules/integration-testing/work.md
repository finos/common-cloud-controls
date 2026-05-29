# Integration testing (AWS) — work list

Track decisions per item using the **Comment** line under each task (or edit status inline).

**Last analyzed run:** 47 pass / 25 fail (72 CSV rows) · coverage **17.4%** of `../cloud-api/...` on AWS  
**Note:** `TestCloudAPIIntegration` always exits PASS; row FAILs are logged only. Coverage includes Azure/GCP files at 0% on an AWS run.

**Status values:** `TODO` · `DONE` · `WON'T FIX` · `DEFER`

---

## A. CSV / harness hygiene (remove noise)

### W-01 — `GetReplicationStatus` (×4 services)

All four AWS implementations return *"replication status not applicable"* → 4 guaranteed FAILs.

- **Action:** return non-error ReplicationStatus unknown/ disabled for services where this doesn't apply.

### W-02 — `object-storage ListDeletedBuckets`

`AWSS3Service.ListDeletedBuckets` always errors (S3 has no bucket-level soft delete).

- [ ] **Action:** return empty 

### W-03 — `object-storage ListObjectVersions`

Method exists on generic interface but not on `*AWSS3Service`.

- [ ] **Action:** AWS implements this: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html

### W-04 — `object-storage UpdateBucketPolicy`

Not implemented on `*AWSS3Service` (Azure/GCP have it).

- [ ] **Action:** Should be possible, see https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html.  The importance of this method is to trigger some admin event that will get logged.

### W-05 — object-storage `GetResourceRegion` / `GetReplicationStatus` / `TriggerDataWrite`

AWS stubs return *"not yet implemented"*.

- [ ] **Action:** Implement them.

### W-06 — Test harness always PASS

Integration test exits PASS even when CSV rows FAIL.

- [ ] **Action:** Fail on any fail.

### W-07 — Coverage scope

`-coverpkg=../cloud-api/...` includes all clouds; AWS-only run shows ~17% total.

- [ ] **Action:** Split coverage per provider

---

## B. Terraform / fixtures (deploy what CSV assumes)

### W-10 — AWS VPC module disabled

`terraform/aws/main.tf` has `module.vpc` commented out (VPC quota).

- [ ] **Action:** turn it on, I'll rerun when the policy change is accepted.

### W-11 — AWS VM module disabled

`module.virtual_machines` commented out in same file.

- [ ] **Action:** turn this on

### W-12 — Flow log group missing

`logging QueryLogs` flow FAIL: log group `/aws/vpc/flow-logs/finos-ccc-integration-vpc` does not exist.

- [ ] **Action:** Depends on W-10; align name with `privateer-config/aws.yml`.  Should fail until that's enabled.

### W-13 — S3 bucket has no bucket policy

`object-storage UpdateResourcePolicy` FAIL: `NoSuchBucketPolicy`.

- [ ] **Action:** Add minimal bucket policy in `terraform/aws/modules/object-storage`, 

### W-14 — Lambda has no public invoke URL

`AttemptPublicInternetInvoke` FAIL: no Function URL and no `public-invoke-url` in config.

- [ ] **Action:** We need a new column in the csv (column 3, shift others right) that says "expect_error", can be true or false. In this case, the function should expect an error and then the test passes.

### W-15 — VPC “public” subnet not actually public

Integration VPC terraform sets `map_public_ip_on_launch = false` on public subnet → CN04 subnet/traffic tests fail.

- [ ] **Action:** See W-14.

---

## C. Config / naming alignment

### W-20 — VPC names vs VPC IDs in CSV

`SelectPublicSubnetForTest` / `GenerateTestTraffic` filter EC2 by `vpc-id`; CSV uses names like `finos-ccc-integration-vpc`.

- [ ] **Action:** If this is just an aws thing, we should probably write some code in the aws module for this.  If it applies to all clouds, we should update the csv.

### W-21 — VM resource is a name, not instance ID

EC2 APIs reject `finos-ccc-integration-vm-main` (`InvalidInstanceID`).

- [ ] **Action:** Add a new column one in the csv which is "cloud".  Can be aws, azure, gcp or all.  For cases where we need to have slightly different parameters for a given cloud, we can use that.

### W-22 — Allow-list peer naming (AWS vs Azure)

| Cloud | Name |
|-------|------|
| Azure terraform | `finos-ccc-integration-vpc-cn03-allow-01` |
| AWS terraform tag | `finos-ccc-integration-vpc-cn03-allowed-01` |

- [ ] **Action:** See w-21

### W-23 — VM `hostName` for inbound connection test

`AttemptInboundConnection` needs reachable host.

- [ ] **Action:** Set `hostName` in `aws.yml` from terraform VM public IP when W-11 is done.
- **Comment:**

---

## D. Code bugs (`modules/cloud-api`)

### W-30 — `CheckUserProvisioned` invalid `MaxResults`

`DescribeInstances` with `MaxResults: 1` → EC2 error (*expecting value greater than 5*).

- [ ] **Action:** omit max results.

### W-31 — CloudTrail `QueryLogs` event category

All admin/data-write/data-read logging rows FAIL: `InvalidEventCategoryException`.

- [ ] **Action:** Fix `logging/aws-logging.go` `queryCloudTrail` (`EventCategory` / API usage).

### W-32 — S3 `TriggerDataWrite` stub

Returns *"not yet implemented"*.

- [ ] **Action:** Order the rows in integration_calls.csv so we create a bucket, create an object, delete the object, delete the bucket in order.  Implement in `object-storage/aws-object-storage.go` (e.g. PutObject probe).

### W-33 — S3 `UpdateResourcePolicy` requires existing policy

Fails on 404 when bucket has no policy.

- [ ] **Action:** Handle empty policy (create minimal)

---

## E. Coverage gaps (implement or stop calling)

| ID | File | ~Coverage | Blocked by |
|----|------|-----------|------------|
| W-40 | `vpc/aws-vpc-test-resource.go` | 8% | W-10, W-20, W-15 |
| W-41 | `vpc/aws-vpc-cn04.go` | 22% | W-40 |
| W-42 | `logging/aws-logging.go` | 38% | W-31, W-12 |
| W-43 | `virtual-machines/aws-virtual-machines.go` | 35% | W-11, W-21, W-30 |
| W-44 | `object-storage/aws-object-storage.go` | 52% | W-32, W-33 |
| W-45 | `RunVpcPeeringDryRunTrialsFromFile` | 0% | Cucumber only — no integration CSV row |
| W-46 | `generic/login/*` | 0% | No CSV rows for login/identity |

### W-40 — VPC test resource / public subnet path

- [ ] **Action:** remove it

### W-41 — VPC CN04 / GenerateTestTraffic

- [ ] **Action:** leave as is

### W-42 — Logging query success paths

- [ ] **Action:** we need to have multiple method calls for the different log types

### W-43 — VM encryption / inbound connection

- [ ] **Action:** leave for now
- **Comment:**

### W-44 — S3 write / policy paths

- [ ] **Action:** see above

### W-45 — CN03 trial matrix file API

Used by `CCC-VPC-CN03-AR01.feature`, not `integration_calls.csv`.

- [ ] **Action:** remove this method

### W-46 — Login / identity coverage

- [ ] **Action:** Remove the code if not used.

---

## F. Misleading PASSes (clarify intent)

### W-50 — `EvaluatePeerAgainstAllowList`

Compares config strings only — no EC2 call.

- [ ] **Action:** needs to call AWS endpoints.

### W-51 — `ValidateAllowListEnforcement` / `ValidateDisallowListEnforcement`

PASS means method returned without error, not that guardrails matched expectations.

- [ ] **Action:** We should be testing this behaviourally, via feature files, not with a method in the class.  The cloud-api should be just an abstraction layer so the same tests can run on each environment.

### W-52 — Peering dry-run with VPC names

Dry-run may run with invalid `VpcId` strings; still returns PASS at CSV level.

- [ ] **Action:** See W21

---

## G. Optional / strategic

### W-60 — Per-cloud CSV files

Single `integration_calls.csv` for all providers; VPC/VM IDs differ by cloud.

- [ ] **Action:** See w21.  Be generic as fas possible.

### W-61 — AWS parity for S3 policy / versions

Implement `ListObjectVersions` / `UpdateBucketPolicy` on `AWSS3Service`.

- [ ] **Action:** Implement 
- **Comment:**

### W-62 — Cross-cloud terraform naming

Standardize resource names (e.g. `cn03-allow-01` vs `cn03-allowed-01`).

- [ ] **Action:** Pick one convention in all `terraform/*/modules/vpc`.
- **Comment:**

---

## Suggested phases

1. **Quick wins:** W-01–W-07, W-30, W-31  
2. **Fixtures:** W-10–W-15, W-20–W-23  
3. **Depth / coverage:** W-32–W-33, W-40–W-46  
4. **Semantics:** W-50–W-52, W-06  

---

## Failure → work item map (last AWS run)

| Failure | ID(s) |
|---------|--------|
| `GetReplicationStatus` ×4 | W-01 |
| `AttemptPublicInternetInvoke` | W-14 |
| VM `InvalidInstanceID` / `InvalidID` | W-11, W-21 |
| VM `CheckUserProvisioned` maxResults | W-30 |
| S3 `UpdateResourcePolicy` NoSuchBucketPolicy | W-13, W-33 |
| S3 not implemented / missing methods | W-05, W-32, W-03, W-04 |
| S3 `ListDeletedBuckets` | W-02 |
| VPC no public subnets / traffic | W-10, W-15, W-20, W-40, W-41 |
| Logging CloudTrail category | W-31 |
| Logging flow log group | W-12, W-42 |

---
