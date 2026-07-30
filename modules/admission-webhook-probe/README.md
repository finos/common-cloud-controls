# Admission webhook probe

This deliberately small validating webhook supports the CCC.K8S.CN11.AR03
fail-closed behavioural test. It only applies to Pods in the labelled disposable
test namespace. A Pod with this label or annotation is rejected with a stable
reason:

```yaml
ccc.finos.org/admission-webhook-probe: reject
```

All other matching Pods are allowed. The registration uses `failurePolicy:
Fail`, so scaling the Deployment to zero tests backend-unavailable behavior
without removing or weakening the webhook configuration.

## Build and test

```sh
go test ./...
docker build -t admission-webhook-probe .
```

The server listens on `:8443` with TLS. Override `LISTEN_ADDRESS`,
`TLS_CERT_FILE`, or `TLS_KEY_FILE` if required. It serves `POST /validate`,
`GET /healthz`, and `GET /readyz`.

## Deploy

1. Issue a serving certificate whose SAN contains
   `ccc-admission-webhook-probe.ccc-admission-webhook-probe.svc`.
2. Create secret `ccc-admission-webhook-probe-tls` with keys `tls.crt` and
   `tls.key` in namespace `ccc-admission-webhook-probe`.
3. Replace `REPLACE_WITH_BASE64_CA_CERTIFICATE` in `deployment.yaml` with the
   base64-encoded PEM CA certificate and pin the container image to an immutable
   digest.
4. Apply the manifest from the standalone test-infrastructure deployment.

Keep the namespace selector and `failurePolicy: Fail` unchanged. The fixture
controller should scale only this Deployment, wait for Service endpoints to
appear/disappear, and restore one ready replica in deferred cleanup.
