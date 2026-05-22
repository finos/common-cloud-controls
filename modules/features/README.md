# Behavioural feature tests

Gherkin features containing **@Behavioural** scenarios only. 

## Layout

```
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

CCC.ObjStor features default to `object-storage/`. CCC.VPC defaults to `vpc/`. Other `@PerService` CCC.Core scenarios without a service tag default to `object-storage/`.

## Test identities

Scenarios that call `GetServiceAPIWithIdentity` pass a **literal identity key** (e.g. `"testUserRead"`). The factory resolves credentials from `test-identities` in Privateer `services.*.vars`. Features do **not** call `ProvisionUserWithAccess`.

| Key | Typical access level |
|-----|----------------------|
| `testUserNoAccess` | none |
| `testUserRead` | read |
| `testUserWrite` | write |
| `testUserAdmin` | admin |

Use `Given a cloud api for "{Config}" in "api"` so the factory receives the expanded vars map.

## Refreshing from ccc-cfi-compliance

```bash
python3 scripts/port-behavioural-features.py
```

Run behavioural tests via `testing/run-compliance-tests.sh` (see `testing/README.md`). Re-run `scripts/port-behavioural-features.py` only when syncing new scenarios from the legacy repo; ObjStor files here use the pre-provisioned identity pattern.
