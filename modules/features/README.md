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

## Test identities (ObjStor)

Scenarios that call `GetServiceAPIWithIdentity` expect pre-provisioned IAM identities in scenario **Props**, not created inside the feature:

| Prop | Typical access level |
|------|----------------------|
| `testUserNoAccess` | none |
| `testUserRead` | read |
| `testUserWrite` | write |

The runner or environment setup must populate these before the scenario runs. Features assert they are present with `"{testUserNoAccess}" is not null` (and similar) in the Background.

## Refreshing from ccc-cfi-compliance

```bash
python3 scripts/port-behavioural-features.py
```

Requires `ccc-cfi-compliance` as a sibling directory of this repository. Re-run the script only for files still using `ProvisionUserWithAccess`; ObjStor files in this repo are maintained separately for the pre-provisioned identity pattern.
