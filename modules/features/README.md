# Behavioural feature tests

Gherkin features containing **@Behavioural** scenarios only.

## Layout

```text
modules/features/
  port/              # @PerPort scenarios (TLS, protocol probes, etc.)
  object-storage/    # @object-storage and CCC.ObjStor behavioural tests
  vpc/               # @vpc behavioural tests
  load-balancer/     # (reserved — no behavioural scenarios ported yet)
  <service>/
    <Catalog>/       # e.g. CCC.Core, CCC.ObjStor, CCC.VPC
      <AR>.feature   # e.g. CCC-Core-CN01-AR01.feature
```

## Routing rules

Scenarios are placed using the first matching tag:

1. `@PerPort` → `port/`
2. `@vpc` → `vpc/`
3. `@object-storage` → `object-storage/`
4. `@load-balancer` → `load-balancer/`
5. `@virtual-machines` → `virtual-machines/`
6. `@serverless-computing` → `serverless-computing/`
7. `@secrets` → `secrets/`

CCC.ObjStor features default to `object-storage/`. CCC.VPC defaults to `vpc/`. Other `@PerService` CCC.Core scenarios without a service tag default to `object-storage/`.

See `virtual-machines/analysis.md` and `serverless-computing/analysis.md` for planned behavioural coverage.

## Test identities

Scenarios that call `GetServiceAPIWithIdentity` pass a **literal identity key** (e.g. `"test-user-read"`). The factory resolves credentials from `test-identities` in Privateer `services.*.vars`. Features do **not** call `ProvisionUserWithAccess`.

| Key | Typical access level |
| ----- | ---------------------- |
| `test-user-no-access` | none |
| `test-user-read` | read |
| `test-user-write` | write |
| `test-user-admin` | admin |

Use `Given a cloud api for "{config}" in "api"` so the factory receives the expanded vars map.

## Step placeholders (Props)

Use **lower-kebab-case** names that match Privateer `services.*.vars` keys, for example:

| Placeholder | Privateer var |
| ------------- | ---------------- |
| `{config}` | (runtime `types.Config`) |
| `{service-type}` | `service-type` |
| `{resource-name}` | discovered resource / `resource` |
| `{host-name}` | `host-name` |
| `{port-number}` | `port-number` |
| `{uid}` | discovered resource ID |
| `{timestamp}` | scenario start (ms) |
| `{permitted-regions}` | `permitted-regions` |

## Refreshing from ccc-cfi-compliance

```bash
python3 scripts/port-behavioural-features.py
```

Run behavioural tests via `testing/run-compliance-tests.sh` (see `testing/README.md`). Re-run `scripts/port-behavioural-features.py` only when syncing new scenarios from the legacy repo; ObjStor files here use the pre-provisioned identity pattern.
