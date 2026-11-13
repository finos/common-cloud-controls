/**
 * Static rules mapping AWS Lambda Terraform configuration to CCC assessment
 * requirements for the CCC.SvlsComp catalog (and the CCC.Core controls it imports).
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see IAM identity policies, SCPs, function code or
 * how the service behaves at runtime. The authoritative checks are the behavioural
 * tests in modules/features.
 *
 * Each rule is keyed by assessment-requirement ID. Requirements without a rule
 * are shown as "Live test only" in the UI.
 */

import type { HclValue } from "../../hcl/parser";
import { references, subBlocks, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { first, fail, isTrusted, locationsTrusted, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

// ── Per-function view of the template ─────────────────────────────────────────

interface Located<T> {
  value: T;
  line: number;
}

interface FunctionUrl {
  res: TfResource;
  auth?: string;
  line: number;
}

interface Permission {
  res: TfResource;
  principal?: string;
  /** source_arn, source_account or principal_org_id narrows who can use the grant. */
  conditioned: boolean;
  line: number;
}

/** An API Gateway REST (v1) or HTTP/WebSocket (v2) API that fronts the function. */
interface FrontingApi {
  res: TfResource;
  kind: "rest" | "http";
  /** REST API with endpoint type PRIVATE (reachable only through a VPC endpoint). */
  isPrivate: boolean;
  /** A route or method that doesn't require authorisation. */
  openRoute?: Located<string>;
  throttle?: Located<string>;
}

export interface FunctionView {
  res: TfResource;
  name?: string;
  region?: string;
  kmsKey?: number;
  reservedConcurrency?: Located<number | undefined>;
  urls: FunctionUrl[];
  permissions: Permission[];
  apis: FrontingApi[];
}

export interface LambdaView extends BaseView<FunctionView> {
  trails: TfResource[];
}

const LAMBDA = "aws_lambda_function";

/** Resources whose `attr` points at the API (by reference). */
function linkedToApi(model: TfModel, type: string, attr: string, api: TfResource) {
  return model.ofType(type).filter((r) => references(r.block.attrs[attr]?.value, api.address));
}

function readApi(model: TfModel, api: TfResource): FrontingApi {
  if (api.type === "aws_api_gateway_rest_api") {
    const ep = first(subBlocks(api.block, "endpoint_configuration"));
    const view: FrontingApi = { res: api, kind: "rest", isPrivate: !!ep && model.strList(ep.attrs.types?.value).includes("PRIVATE") };
    const open = linkedToApi(model, "aws_api_gateway_method", "rest_api_id", api).find((m) => (model.str(m.block.attrs.authorization?.value) ?? "NONE").toUpperCase() === "NONE");
    if (open) view.openRoute = { value: open.address, line: open.block.attrs.authorization?.line ?? open.block.line };
    for (const ms of linkedToApi(model, "aws_api_gateway_method_settings", "rest_api_id", api)) {
      const s = first(subBlocks(ms.block, "settings"));
      const rate = s && model.num(s.attrs.throttling_rate_limit?.value);
      if (s && rate !== undefined && rate >= 0) view.throttle = { value: `${ms.address} throttles to ${rate} requests/second`, line: s.attrs.throttling_rate_limit!.line };
    }
    for (const up of model.ofType("aws_api_gateway_usage_plan")) {
      const stages = subBlocks(up.block, "api_stages").some((s) => references(s.attrs.api_id?.value, api.address));
      const t = first(subBlocks(up.block, "throttle_settings"));
      if (stages && t) view.throttle = { value: `usage plan ${up.address} throttles each API key`, line: t.line };
    }
    return view;
  }
  const view: FrontingApi = { res: api, kind: "http", isPrivate: false };
  const open = linkedToApi(model, "aws_apigatewayv2_route", "api_id", api).find((r) => (model.str(r.block.attrs.authorization_type?.value) ?? "NONE").toUpperCase() === "NONE");
  if (open) view.openRoute = { value: open.address, line: open.block.attrs.authorization_type?.line ?? open.block.line };
  for (const st of linkedToApi(model, "aws_apigatewayv2_stage", "api_id", api)) {
    for (const s of [...subBlocks(st.block, "default_route_settings"), ...subBlocks(st.block, "route_settings")]) {
      const rate = model.num(s.attrs.throttling_rate_limit?.value);
      if (rate !== undefined) view.throttle = { value: `${st.address} throttles to ${rate} requests/second`, line: s.attrs.throttling_rate_limit!.line };
    }
  }
  return view;
}

export function buildLambdaView(model: TfModel, settings: LabsSettings): LambdaView {
  const apis = [...model.ofType("aws_api_gateway_rest_api"), ...model.ofType("aws_apigatewayv2_api")];

  const buckets = model.ofType(LAMBDA).map((res): FunctionView => {
    const b = res.block;
    const name = model.str(b.attrs.function_name?.value);
    const pointsHere = (v: HclValue | undefined) => references(v, res.address) || (name !== undefined && model.str(v) === name);
    const linked = (type: string, attr = "function_name") => model.ofType(type).filter((r) => pointsHere(r.block.attrs[attr]?.value));

    const rc = b.attrs.reserved_concurrent_executions;
    const view: FunctionView = {
      res,
      name,
      region: model.regionFor(res),
      kmsKey: b.attrs.kms_key_arn ? b.attrs.kms_key_arn.line : undefined,
      reservedConcurrency: rc ? { value: model.num(rc.value), line: rc.line } : undefined,
      urls: linked("aws_lambda_function_url").map((u) => ({
        res: u,
        auth: model.str(u.block.attrs.authorization_type?.value),
        line: u.block.attrs.authorization_type?.line ?? u.block.line,
      })),
      permissions: linked("aws_lambda_permission").map((p) => {
        const a = p.block.attrs;
        return {
          res: p,
          principal: model.str(a.principal?.value),
          conditioned: !!(a.source_arn || a.source_account || a.principal_org_id),
          line: a.principal?.line ?? p.block.line,
        };
      }),
      apis: [],
    };

    // APIs that front this function: via an integration pointing at it, or a permission scoped to the API.
    const integrations = [...model.ofType("aws_api_gateway_integration"), ...model.ofType("aws_apigatewayv2_integration")].filter((i) =>
      references(i.block.attrs.uri?.value ?? i.block.attrs.integration_uri?.value, res.address),
    );
    for (const api of apis) {
      const viaIntegration = integrations.some((i) => references(i.block.attrs.rest_api_id?.value ?? i.block.attrs.api_id?.value, api.address));
      const viaPermission = view.permissions.some((p) => references(p.res.block.attrs.source_arn?.value, api.address));
      if (viaIntegration || viaPermission) view.apis.push(readApi(model, api));
    }
    return view;
  });

  return { model, buckets, settings, trails: model.ofType("aws_cloudtrail") };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A resource-policy grant to everyone with nothing narrowing it. */
function publicPermission(f: FunctionView) {
  return f.permissions.find((p) => p.principal === "*" && !p.conditioned);
}

const apiGatewayPermission = (f: FunctionView) => f.permissions.find((p) => p.principal === "apigateway.amazonaws.com");

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<FunctionView, LambdaView>();

// Network exposure ------------------------------------------------------------

const notPubliclyReachable = bucket((f) => {
  const openUrl = f.urls.find((u) => u.auth === "NONE");
  if (openUrl) return fail(`${openUrl.res.address} is a function URL with authorization_type = "NONE", so anyone on the internet can invoke it.`, openUrl.line);
  const perm = publicPermission(f);
  if (perm) return fail(`${perm.res.address} lets principal "*" invoke the function with no source_arn or source_account condition.`, perm.line);
  const publicApi = f.apis.find((a) => !a.isPrivate);
  if (publicApi) {
    return fail(
      `The function is fronted by ${publicApi.res.address}, ${publicApi.kind === "http" ? "an HTTP API (always internet-facing)" : "a REST API whose endpoint type isn't PRIVATE"}.`,
      publicApi.res.block.line,
    );
  }
  const iamUrl = f.urls[0];
  if (iamUrl) {
    return warn(`${iamUrl.res.address} gives the function a public HTTPS endpoint. It requires SigV4 (AWS_IAM) auth, but it's still reachable from the internet.`, iamUrl.line);
  }
  const apiPerm = apiGatewayPermission(f);
  if (apiPerm && !f.apis.length) {
    return warn("API Gateway is allowed to invoke the function, but the API isn't defined in this template, so whether it's private can't be checked.", apiPerm.line);
  }
  if (f.apis.length) return pass(`Only reachable through ${f.apis.map((a) => a.res.address).join(", ")}, a private REST API.`, f.apis[0].res.block.line);
  return pass("No function URL, public API or resource-policy grant: the function can only be invoked through the IAM-authenticated Lambda API.", f.res.block.line);
});

// Rate limiting ---------------------------------------------------------------

const invocationRateLimited = bucket((f) => {
  const throttled = f.apis.find((a) => a.throttle);
  const rc = f.reservedConcurrency;
  if (rc?.value !== undefined && rc.value > 0) {
    return pass(`reserved_concurrent_executions caps the function at ${rc.value} concurrent invocation(s); further requests are throttled (429).`, rc.line);
  }
  if (throttled?.throttle) return pass(`Requests are rate-limited by API Gateway: ${throttled.throttle.value}.`, throttled.throttle.line);
  if (rc?.value === 0) return warn("reserved_concurrent_executions = 0 throttles every invocation, which disables the function rather than limiting it.", rc.line);
  return fail(
    "No reserved_concurrent_executions or API Gateway throttling, so a single caller can scale the function up to the account-wide concurrency limit (and starve other functions).",
    rc?.line ?? f.res.block.line,
  );
});

// Encryption ------------------------------------------------------------------

const encryptionInTransit = bucket((f) => {
  const endpoints = ["the Lambda Invoke API", ...(f.urls.length ? ["function URLs"] : []), ...(f.apis.length ? ["API Gateway"] : [])];
  const list = endpoints.length > 1 ? `${endpoints.slice(0, -1).join(", ")} and ${endpoints[endpoints.length - 1]}` : endpoints[0];
  return pass(`${list[0].toUpperCase()}${list.slice(1)} only ${endpoints.length > 1 ? "accept" : "accepts"} HTTPS; there's no plain-HTTP endpoint to turn off.`, f.urls[0]?.line ?? f.res.block.line);
});

const encryptionAtRest = bucket((f) => {
  if (f.kmsKey) return pass("Environment variables are encrypted at rest with a customer-managed KMS key (kms_key_arn).", f.kmsKey);
  return pass(
    "Lambda always encrypts environment variables and code at rest with an AWS-managed key. Set kms_key_arn to use a customer-managed key you control.",
    first(subBlocks(f.res.block, "environment"))?.line ?? f.res.block.line,
  );
});

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template((t) => {
  if (!t.trails.length) return fail("No aws_cloudtrail resource. Management events (e.g. UpdateFunctionConfiguration) are only kept for 90 days in Event History without a trail.");
  const tr = t.trails[0];
  if (t.model.bool(tr.block.attrs.enable_logging?.value) === false) return fail("CloudTrail is declared with enable_logging = false.", tr.block.attrs.enable_logging?.line);
  const selectors = subBlocks(tr.block, "event_selector");
  if (selectors.length && selectors.every((s) => t.model.bool(s.attrs.include_management_events?.value) === false)) {
    return fail("CloudTrail event selectors exclude management events.", selectors[0].line);
  }
  return pass(`${tr.address} records management events (who changed which function, when, and the result).`, tr.block.line);
});

/** True when a data_resource's values cover this function: all functions, or this one by reference or name. */
function selectsFunction(f: FunctionView, t: LambdaView, values: HclValue | undefined): boolean {
  const resolved = t.model.resolve(values);
  const items = resolved?.t === "list" ? resolved.items : resolved ? [resolved] : [];
  return items.some((v) => {
    const s = t.model.str(v) ?? (v.t === "str" ? v.v : "");
    return /^arn:aws:lambda$/.test(s) || references(v, f.res.address) || (!!f.name && s.endsWith(`:function:${f.name}`));
  });
}

const invocationsLogged = bucket((f, t) => {
  for (const tr of t.trails) {
    for (const s of subBlocks(tr.block, "event_selector")) {
      if (subBlocks(s, "data_resource").some((d) => t.model.str(d.attrs.type?.value) === "AWS::Lambda::Function" && selectsFunction(f, t, d.attrs.values?.value))) {
        return pass(`${tr.address} records Lambda Invoke data events (caller identity, time and result) for this function.`, s.line);
      }
    }
    for (const s of subBlocks(tr.block, "advanced_event_selector")) {
      if (subBlocks(s, "field_selector").some((x) => t.model.strList(x.attrs.equals?.value).includes("AWS::Lambda::Function"))) {
        return pass(`${tr.address} records Lambda Invoke data events (advanced selector).`, s.line);
      }
    }
  }
  return fail(
    "Invocations are CloudTrail data events, which aren't recorded unless a trail selects AWS::Lambda::Function. CloudWatch Logs only hold what the function code prints.",
    t.trails[0]?.block.line ?? f.res.block.line,
  );
});

const logsSeparatedFromResource = bucket((f) => {
  const lc = first(subBlocks(f.res.block, "logging_config"));
  const group = lc?.attrs.log_group ? "the configured log group" : `/aws/lambda/${f.name ?? "<function>"}`;
  return pass(`Lambda writes its logs to CloudWatch Logs (${group}), outside the function; the function can't reach them unless its role is granted logs read access.`, lc?.line ?? f.res.block.line);
});

// Access ----------------------------------------------------------------------

const noAnonymousInvocation = bucket((f) => {
  const openUrl = f.urls.find((u) => u.auth === "NONE");
  if (openUrl) return fail(`${openUrl.res.address} has authorization_type = "NONE", so unauthenticated callers can invoke the function.`, openUrl.line);
  const perm = publicPermission(f);
  if (perm) return fail(`${perm.res.address} grants lambda:InvokeFunction to principal "*" without conditions.`, perm.line);
  const openApi = f.apis.find((a) => a.openRoute);
  if (openApi?.openRoute) return fail(`${openApi.openRoute.value} on ${openApi.res.address} has no authorisation, so anonymous callers reach the function.`, openApi.openRoute.line);
  if (apiGatewayPermission(f) && !f.apis.length) {
    return warn("API Gateway can invoke the function, but the API isn't in this template, so whether its routes require authorisation can't be checked.", apiGatewayPermission(f)!.line);
  }
  const paths = ["the Lambda Invoke API requires IAM authentication"];
  if (f.urls.length) paths.push("the function URL requires SigV4 (AWS_IAM) signing");
  if (f.apis.length) paths.push("every API Gateway route has an authoriser");
  return pass(
    `No anonymous invocation path: ${paths.slice(0, -1).join(", ")}${paths.length > 1 ? " and " : ""}${paths[paths.length - 1]}. Which identities are authorised is decided by IAM policies outside this template.`,
    f.urls[0]?.line ?? f.res.block.line,
  );
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((f, t) => {
  const line = f.res.block.attrs.region?.line ?? t.model.awsRegion().line ?? f.res.block.line;
  if (!f.region) return warn("The region is unknown or computed at apply time (e.g. from an environment variable).", line);
  if (isTrusted(f.region, t.settings)) return pass(`Deployed to ${f.region}, which is in the trusted list.`, line);
  return fail(`Deployed to ${f.region}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "aws_", "AWS", (r) => t.model.regionFor(r)));

// ── Registry ──────────────────────────────────────────────────────────────────

export const aws: ProviderRules<FunctionView, LambdaView> = {
  id: "aws",
  label: "AWS",
  prefix: "aws_",
  noun: { one: "function", many: "functions" },
  build: buildLambdaView,
  rules: {
    // CCC.Core (imported by CCC.SvlsComp). CN01.AR01 (TLS 1.3): Lambda endpoints also accept TLS 1.2
    // and there's no setting to change that, so it's left to the live test.
    "CCC.Core.CN01.AR03": encryptionInTransit,
    "CCC.Core.CN02.AR01": encryptionAtRest,
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN04.AR02": invocationsLogged,
    "CCC.Core.CN04.AR03": invocationsLogged,
    "CCC.Core.CN05.AR01": noAnonymousInvocation,
    "CCC.Core.CN05.AR04": noAnonymousInvocation,
    "CCC.Core.CN05.AR06": noAnonymousInvocation,
    "CCC.Core.CN06.AR01": regionTrusted,
    "CCC.Core.CN06.AR02": childRegionsTrusted,
    "CCC.Core.CN09.AR01": logsSeparatedFromResource,

    // CCC.SvlsComp
    "CCC.SvlsComp.CN01.AR01": notPubliclyReachable,
    "CCC.SvlsComp.CN02.AR01": invocationRateLimited,
  },
};
