# Integration testing — work list

## AWS

**Last run:** **77 pass / 0 fail** (77 `aws` rows) · exit **0** · coverage **~21%** (scoped `-coverpkg`, excludes `generic/login`).

Re-run: `./run-integration-tests.sh aws`

## GCP

**Last run:** **66 pass / 0 fail** (66 `gcp` rows) · exit **0** · coverage **~18%** (scoped `-coverpkg`, excludes `generic/login`).

Re-run: `./run-integration-tests.sh gcp` (sources `user-creation/gcp-env.sh`; sets `GCP_PROJECT_ID` from `gcloud` when unset).

**CSV / scope:** VPC rows use `cloud=all` (AWS EC2 dry-run + GCP simulated CN03 guardrail). Object-storage retention-sensitive rows split per cloud (`gcp-write-probe` key, `SetBucketRetentionDurationDays` without `expect_error` on GCP). Temp bucket create/delete pairs use `finos-ccc-integration-temp-csv-gcp`.

**VPC (GCP):** [`gcp-vpc.go`](../cloud-api/vpc/gcp-vpc.go) + CN03 in [`gcp-vpc-cn03.go`](../cloud-api/vpc/gcp-vpc-cn03.go) (shared allow/disallow logic in [`cn03_shared.go`](../cloud-api/vpc/cn03_shared.go)). Peering dry-run uses yaml lists + network existence checks (GCP has no EC2-style dry-run). CN02/CN04 subnet/instance helpers stubbed in [`gcp-vpc-stubs.go`](../cloud-api/vpc/gcp-vpc-stubs.go).

---

## Optional / deferred

### W-15 — VPC public subnet (`map_public_ip_on_launch = false`)

CN04 / `GenerateTestTraffic` not in CSV. Fix in [`terraform/aws/modules/vpc/main.tf`](terraform/aws/modules/vpc/main.tf) when re-adding those rows.

### W-62 — GCP terraform apply after rename

GCP VPC network renamed to `finos-ccc-integration-vpc-cn03-allow-01` in code. Run `terraform apply` under [`terraform/gcp`](terraform/gcp) to replace the old network name in GCP.

### W-07 — Coverage scope

`-coverpkg` lists exercised packages only (no `generic/login`). Per-cloud jobs still optional.

### W-41 — VPC CN04

Not in integration CSV.

### W-46 — `generic/login`

**Keep** — used by [`BasicServiceRunner`](../runner/BasicServiceRunner.go) for Azure CLI refresh before TearDown. Not in integration CSV by design; excluded from coverage scope.

### GCP VPC CN02 / CN04

`SelectPublicSubnetForTest`, `CreateTestResourceInSubnet`, `GenerateTestTraffic` stubbed on GCP (not in integration CSV).

### GCP virtual-machines

Add `virtual-machines` CSV rows + cloud-api coverage when GCP VM integration fixtures are ready (terraform module exists).

---

## Expected-error PASS (by design)

**AWS / all clouds where applicable**

- `AttemptPublicInternetInvoke` — no public Function URL / internal-only ingress.
- `SetObjectPermission` — BPA / uniform bucket-level access blocks public ACLs.
- `RestoreBucket` — not supported on AWS S3 / GCS at bucket level.
- `SetBucketRetentionDurationDays` — `expect_error` on **aws** only (locked policy); GCP row expects success when policy is unlocked.
