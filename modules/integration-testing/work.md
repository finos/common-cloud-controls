# Integration testing (AWS) — work list

**Last run:** **77 pass / 0 fail** (77 `aws` rows) · exit **0** · coverage **21.1%** (scoped `-coverpkg`, excludes `generic/login`).

Re-run: `./run-integration-tests.sh aws`

---

## Optional / deferred

### W-15 — VPC public subnet (`map_public_ip_on_launch = false`)

CN04 / `GenerateTestTraffic` not in CSV. Fix in [`terraform/aws/modules/vpc/main.tf`](terraform/aws/modules/vpc/main.tf) when re-adding those rows.

### W-62 — GCP terraform apply after rename

GCP VPC network renamed to `finos-ccc-integration-vpc-cn03-allow-01` in code. Run `terraform apply` under [`terraform/gcp`](terraform/gcp) to replace the old network name in GCP.

### W-07 — Coverage scope

`-coverpkg` now lists exercised packages only (no `generic/login`). Per-cloud jobs still optional.

### W-41 — VPC CN04

Not in integration CSV.

### W-46 — `generic/login`

**Keep** — used by [`BasicServiceRunner`](../runner/BasicServiceRunner.go) for Azure CLI refresh before TearDown. Not in integration CSV by design; excluded from coverage scope.

---

## Expected-error PASS (by design)

- `AttemptPublicInternetInvoke` — no public Function URL.
- `SetObjectPermission` — BPA blocks public ACLs on integration bucket.
- `RestoreBucket` / `SetBucketRetentionDurationDays` — not supported on AWS S3 at bucket level.
