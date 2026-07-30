#!/usr/bin/env python3
"""Minimal FINOS reachability probe (placeholder until modules/probes/reachability Go binary ships).

POST /v1/probes with JSON body {Host, Port, Protocol, ServerName, Timeout, NetworkContext}
Authorization: HMAC-SHA256 over timestamp + nonce + body using REACHABILITY_PROBE_SHARED_SECRET.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import socket
import ssl
import time
import urllib.error
import urllib.request
from typing import Any


def _secret() -> bytes:
    # Prefer injected env; optional Secrets Manager fetch by ARN.
    direct = os.environ.get("REACHABILITY_PROBE_SHARED_SECRET", "")
    if direct:
        return direct.encode()
    arn = os.environ.get("REACHABILITY_PROBE_SECRET_ARN", "")
    if not arn:
        raise RuntimeError("shared secret not configured")
    import boto3

    resp = boto3.client("secretsmanager").get_secret_value(SecretId=arn)
    return resp["SecretString"].encode()


def _verify(event: dict[str, Any], body: bytes) -> None:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    ts = headers.get("x-ccc-timestamp", "")
    nonce = headers.get("x-ccc-nonce", "")
    sig = headers.get("x-ccc-signature", "")
    if not ts or not nonce or not sig:
        raise PermissionError("missing auth headers")
    if abs(time.time() - int(ts)) > 60:
        raise PermissionError("timestamp skew")
    mac = hmac.new(_secret(), f"{ts}.{nonce}.".encode() + body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(mac, sig):
        raise PermissionError("bad signature")


def _probe(req: dict[str, Any]) -> dict[str, Any]:
    host = req["Host"]
    port = int(req["Port"])
    protocol = (req.get("Protocol") or "tcp").lower()
    server_name = req.get("ServerName") or host
    timeout = float(req.get("Timeout") or 5) / 1000.0 if float(req.get("Timeout") or 5) > 50 else float(req.get("Timeout") or 5)
    # Timeout may be ms or seconds; treat >50 as ms.
    if timeout > 50:
        timeout = timeout / 1000.0

    started = time.time()
    result: dict[str, Any] = {
        "Observer": "finos-public-probe",
        "DNSResolved": False,
        "TCPConnected": False,
        "TLSConnected": False,
        "HTTPStatus": 0,
        "RemoteAddr": "",
        "Failure": "",
        "Duration": 0,
    }
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        result["DNSResolved"] = True
        family, socktype, proto, _, sockaddr = infos[0]
        with socket.socket(family, socktype, proto) as sock:
            sock.settimeout(timeout)
            sock.connect(sockaddr)
            result["TCPConnected"] = True
            result["RemoteAddr"] = f"{sockaddr[0]}:{sockaddr[1]}"
            if protocol in ("tls", "https"):
                ctx = ssl.create_default_context()
                with ctx.wrap_socket(sock, server_hostname=server_name) as ssock:
                    result["TLSConnected"] = True
                    if protocol == "https":
                        ssock.sendall(f"HEAD / HTTP/1.1\r\nHost: {server_name}\r\nConnection: close\r\n\r\n".encode())
                        data = ssock.recv(128).decode(errors="ignore")
                        if data.startswith("HTTP/"):
                            result["HTTPStatus"] = int(data.split(" ", 2)[1])
    except Exception as exc:  # noqa: BLE001 — surface as Failure evidence
        result["Failure"] = f"{type(exc).__name__}: {exc}"
    result["Duration"] = int((time.time() - started) * 1000)
    return result


def handler(event, _context):
    body_raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body_raw)
    else:
        body = body_raw.encode() if isinstance(body_raw, str) else body_raw

    try:
        _verify(event, body)
        req = json.loads(body.decode() or "{}")
        result = _probe(req)
        return {"statusCode": 200, "headers": {"content-type": "application/json"}, "body": json.dumps(result)}
    except PermissionError as exc:
        return {"statusCode": 401, "body": json.dumps({"Failure": str(exc)})}
    except Exception as exc:  # noqa: BLE001
        return {"statusCode": 500, "body": json.dumps({"Failure": str(exc)})}
