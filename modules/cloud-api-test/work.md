# Integration testing — work list

**Combined coverage:** `./run-integration-tests.sh all` runs aws → azure → gcp, merges `-coverprofile` outputs with `gocovmerge`, writes `coverage-integration-all.html` (plus per-cloud artifacts).

## AWS

**Last run:** **77 pass / 0 fail** (77 rows: 66 shared `all` + 11 `aws`-only temp bucket) · exit **0** · coverage **~21%** (`-coverpkg=../cloud-api/...`, incl. `generic/login`).

Re-run: `./run-integration-tests.sh aws`

## GCP

**Last run:** **66 pass / 0 fail** (66 `gcp` rows) · exit **0** · coverage **~18%** (`-coverpkg=../cloud-api/...`, incl. `generic/login`).

Re-run after VM `all` expansion: expect **77** rows (adds 11 `virtual-machines` calls).

Re-run: `./run-integration-tests.sh gcp` (sources `environment-config/gcp-env.sh`; sets `GCP_PROJECT_ID` from `gcloud` when unset).

**CSV / scope:** VPC rows use `cloud=all` (AWS EC2 dry-run + GCP simulated CN03 guardrail). Object-storage retention-sensitive rows split per cloud (`gcp-write-probe` key, `SetBucketRetentionDurationDays` without `expect_error` on GCP). Temp bucket create/delete pairs use `finos-ccc-integration-temp-csv-gcp`.

**VPC (GCP):** [`gcp-vpc.go`](../cloud-api/vpc/gcp-vpc.go) + CN03 in [`gcp-vpc-cn03.go`](../cloud-api/vpc/gcp-vpc-cn03.go) (shared allow/disallow logic in [`cn03_shared.go`](../cloud-api/vpc/cn03_shared.go)). CN02/CN04 in [`gcp-vpc-test-resource.go`](../cloud-api/vpc/gcp-vpc-test-resource.go) (public subnet selection + short-lived instance lifecycle; not in integration CSV).

## Azure

**Last run:** **66 pass / 0 fail** (66 `azure` rows) · exit **0** · coverage **~23.5%** (`-coverpkg=../cloud-api/...`, incl. `generic/login`).

Re-run after VM `all` expansion: expect **77** rows (adds 11 `virtual-machines` calls). `run-integration-tests.sh` exports `AZURE_VM_HOSTNAME` from terraform when unset.

Re-run: `./run-integration-tests.sh azure` (sources `environment-config/azure-env.sh`; may set `AZURE_LOG_ANALYTICS_WORKSPACE_ID` from `terraform/azure/terraform.tfstate` when unset).

**Terraform:** VM default size **`Standard_D2s_v3`** (B-series had no capacity in westus2). Apply under [`terraform/azure`](terraform/azure) before first run.

**CSV / scope:** Object-storage probe rows split per cloud (`azure-write-probe` for create/read/retention/versions). Temp container lifecycle uses `finos-ccc-integration-temp-csv-azure`. Flow log query is **`expect_error` on azure** only (NSG flow logs retired; `AzureNetworkAnalytics_CL` not populated).

**Cloud API added/fixed:** [`azure-vpc.go`](../cloud-api/vpc/azure-vpc.go) + CN03 (simulated guardrail, shared [`cn03_shared.go`](../cloud-api/vpc/cn03_shared.go)); CN02/CN04 in [`azure-vpc-test-resource.go`](../cloud-api/vpc/azure-vpc-test-resource.go); blob parity (`ListObjectVersions`, `ReadObjectAtVersion`/`latest`, immutable create idempotency, `TriggerDataWrite`, `GetResourceRegion`); serverless (`ReplicationStatusNotApplicable`, public invoke error when no URL, burst via private endpoint).

**Coverage highlights (azure run):** logging QueryLogs/admin/storage ~80–90%; object-storage CRUD/list ~85%; vpc CN03 ~70%+; factory ~68%.

---

## Optional / deferred

### W-15 — VPC public subnet (`map_public_ip_on_launch = false`)

CN04 / `GenerateTestTraffic` not in CSV. Fix in [`terraform/aws/modules/vpc/main.tf`](terraform/aws/modules/vpc/main.tf) when re-adding those rows.

### W-62 — GCP terraform apply after rename

GCP VPC network renamed to `finos-ccc-integration-vpc-cn03-allow-01` in code. Run `terraform apply` under [`terraform/gcp`](terraform/gcp) to replace the old network name in GCP.

### W-63 — Azure flow logs (VNet flow logs migration)

Legacy NSG flow logs cannot be created (retired June 2025). Integration CSV uses `expect_error` for azure `QueryLogs` flow until fixtures use [VNet flow logs](https://learn.microsoft.com/azure/network-watcher/vnet-flow-logs-overview) + compatible LAW table (e.g. `NTANetAnalytics`).

### W-07 — Coverage scope

`-coverpkg=../cloud-api/...` (full module). Per-cloud jobs still optional; overall % stays low until all clouds run.

### W-41 — VPC CN04

Not in integration CSV.

### W-46 — `generic/login`

**Keep** — used by [`BasicServiceRunner`](../runner/BasicServiceRunner.go) for Azure CLI refresh before TearDown. Not in integration CSV yet; **included** in `-coverpkg` so HTML report flags 0% / low coverage until login paths are tested or exercised.

### Azure/GCP VPC CN02 / CN04

Implemented in [`azure-vpc-test-resource.go`](../cloud-api/vpc/azure-vpc-test-resource.go) and [`gcp-vpc-test-resource.go`](../cloud-api/vpc/gcp-vpc-test-resource.go) (shared helpers in [`cn02_shared.go`](../cloud-api/vpc/cn02_shared.go), [`cn04_shared.go`](../cloud-api/vpc/cn04_shared.go)). Not in integration CSV yet (AWS CN04 still blocked on W-15 public-subnet fixture).

### virtual-machines CSV

`virtual-machines` rows use `cloud=all` (11 calls). Azure/GCP need `hostName` from terraform (`AZURE_VM_HOSTNAME` / `GCP_VM_HOSTNAME`; script auto-exports from state when unset).

---

## Expected-error PASS (by design)

- `AttemptPublicInternetInvoke` — no public Function URL / internal-only ingress.
- `SetObjectPermission` — BPA / uniform bucket-level access blocks public ACLs.
- `RestoreBucket` — not supported on AWS S3 / GCS at bucket level.
- `SetBucketRetentionDurationDays` — `expect_error` on **aws** only (locked policy); azure/gcp rows expect success when policy is unlocked.
- `QueryLogs` flow on **azure** — Traffic Analytics table absent until VNet flow log migration (W-63).
