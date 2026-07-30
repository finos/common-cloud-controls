# Reachability probe

This standalone service makes bounded DNS, TCP, TLS, and HTTPS observations
from a known untrusted network vantage point. It implements the request and
result contract in `cloud-api/reachability` and exposes:

- `POST /v1/probes`
- `GET /health` and `GET /healthz`

It is intentionally not a general-purpose network scanner. Every target and
port must be allowlisted, every resolved address is checked before dialing, and
loopback, private, link-local, multicast, unspecified, and cloud metadata
addresses are denied by default. All addresses returned for a DNS name must
pass policy; connections are made to the validated IP rather than resolving
again during dial.

## Configuration

| Environment variable | Required | Description |
| --- | --- | --- |
| `SHARED_SECRET` | yes | At least 32 bytes, supplied by secret storage |
| `TARGET_ALLOWLIST` | yes | Comma-separated exact hosts/IPs/CIDRs or `*.example.com` suffixes |
| `PORT_ALLOWLIST` | yes | Comma-separated ports, such as `443,22,3389` |
| `ALLOW_PRIVATE_CIDRS` | no | Explicit CIDRs allowed to override default address blocking |
| `OBSERVER_NAME` | no | Result observer identity; default `finos-public-probe` |
| `LISTEN_ADDRESS` | no | Default `:8080` |
| `MAX_CLOCK_SKEW` | no | Authentication freshness window; default `5m`, maximum `15m` |
| `MAX_PROBE_TIMEOUT` | no | Maximum per-probe budget; default `10s`, maximum `30s` |
| `REQUESTS_PER_MINUTE` | no | Per-source-IP fixed-window limit; default `60` |

Private or metadata CIDRs should only be added when the deployment has a
documented need and its network egress policy independently restricts the
destination. Prefer exact fixture hostnames over wildcard rules.

## Authentication

Clients send `X-CCC-Timestamp` (Unix seconds), a random lowercase-hex
`X-CCC-Nonce`, and:

```text
X-CCC-Signature: sha256=hex(HMAC-SHA256(secret,
  timestamp + "\n" + nonce + "\n" + exact_request_body))
```

Stale timestamps and previously accepted nonces are rejected. Audit logs hash
caller and target identifiers and never include request bodies, signatures,
nonces, shared secrets, resolved addresses, or detailed network errors.

## Build and test

From `modules/reachability-probe`:

```sh
go test ./...
```

Build the image from the repository root because the module imports the shared
cloud-api contract:

```sh
docker build -f modules/reachability-probe/Dockerfile -t reachability-probe .
```

## Deploy

`deployment.yaml` is a hardened Kubernetes baseline. Before applying it:

1. Create namespace `ccc-test-infra` and secret `ccc-reachability-probe` with
   key `shared-secret`.
2. Replace the sample target list with the smallest set of fixture endpoints
   and pin the image to an immutable digest.
3. Put the Service behind an HTTPS load balancer or ingress. The cloud-api
   remote client rejects non-HTTPS URLs.
4. Assign a stable, documented public egress identity and deploy outside the
   tested estates' trust perimeter.
5. Restrict inbound traffic to CI callers and restrict egress with platform
   firewall controls. Kubernetes NetworkPolicy alone cannot safely express
   DNS-name destinations.
6. Rotate the shared secret through protected CI/deployment secret stores;
   never expose it in Terraform output or logs.

The process serves HTTP because TLS is expected to terminate at the managed
load balancer. Do not expose the ClusterIP Service directly.
