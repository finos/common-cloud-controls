/**
 * Static rules mapping Azure Functions Terraform (azurerm provider) to CCC
 * assessment requirements for CCC.SvlsComp and the CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * The function app is the primary resource: network exposure, TLS and
 * authentication are configured on the app, not on individual functions. The
 * storage account and service plan a function app needs belong to other
 * services and aren't judged here. HTTP-trigger auth levels (function keys)
 * live in code and are invisible to these rules. The authoritative checks are
 * the behavioural tests in modules/features.
 */

import type { HclBlock, HclValue } from "../../hcl/parser";
import { references, subBlocks, textOf, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { azureLocation, fail, first, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

interface Located<T> {
  value: T;
  line: number;
}

interface DiagnosticSetting {
  res: TfResource;
  covers: boolean;
  storageDestination?: HclValue;
  destination?: string;
}

export interface FunctionAppView {
  res: TfResource;
  name?: string;
  location?: string;
  publicAccess?: Located<boolean | undefined>;
  privateEndpoint?: TfResource;
  /** Inbound access restrictions: default action Deny, or at least one Allow rule. */
  ipRestricted?: Located<string>;
  httpsOnly?: Located<boolean | undefined>;
  minTls?: Located<string | undefined>;
  clientCert?: { enabled?: boolean; mode?: string; line: number };
  auth?: { enabled?: boolean; required?: boolean; action?: string; line: number };
  scaleLimit?: Located<string>;
  /** Address of the azurerm_storage_account the app uses for its runtime state, if defined here. */
  storageAccount?: string;
  appInsights?: number;
  keyVaultRefs?: number;
  diagnostics: DiagnosticSetting[];
}

export interface FunctionsView extends BaseView<FunctionAppView> {
  activityLogExports: TfResource[];
  rateLimitPolicy?: TfResource;
}

const FUNCTION_APPS = ["azurerm_linux_function_app", "azurerm_windows_function_app", "azurerm_function_app_flex_consumption"];

function rawText(v: HclValue | undefined): string {
  if (!v) return "";
  return v.t === "str" ? v.v : textOf(v);
}

function categoriesOf(model: TfModel, res: TfResource) {
  const categories = new Set<string>();
  const groups = new Set<string>();
  for (const b of [...subBlocks(res.block, "enabled_log"), ...subBlocks(res.block, "log")]) {
    if (model.bool(b.attrs.enabled?.value) === false) continue;
    const c = model.str(b.attrs.category?.value);
    const g = model.str(b.attrs.category_group?.value);
    if (c) categories.add(c);
    if (g) groups.add(g);
  }
  return { categories, groups };
}

const destinationOf = (d: HclBlock) =>
  d.attrs.log_analytics_workspace_id ? "a Log Analytics workspace" : d.attrs.eventhub_authorization_rule_id ? "Event Hubs" : d.attrs.storage_account_id ? "a storage account" : undefined;

export function buildFunctionsView(model: TfModel, settings: LabsSettings): FunctionsView {
  const diagnostics = model.ofType("azurerm_monitor_diagnostic_setting");

  const buckets = FUNCTION_APPS.flatMap((type) => model.ofType(type)).map((res): FunctionAppView => {
    const b = res.block;
    const sc = first(subBlocks(b, "site_config"));
    const attr = <T>(block: HclBlock | undefined, key: string, read: (v: HclValue | undefined) => T): Located<T> | undefined => {
      const a = block?.attrs[key];
      return a ? { value: read(a.value), line: a.line } : undefined;
    };

    const view: FunctionAppView = {
      res,
      name: model.str(b.attrs.name?.value),
      location: azureLocation(model, b.attrs.location?.value),
      publicAccess: attr(b, "public_network_access_enabled", (v) => model.bool(v)),
      httpsOnly: attr(b, "https_only", (v) => model.bool(v)),
      minTls: attr(sc, "minimum_tls_version", (v) => model.str(v)),
      diagnostics: [],
    };

    view.privateEndpoint = model
      .ofType("azurerm_private_endpoint")
      .find((pe) => subBlocks(pe.block, "private_service_connection").some((c) => references(c.attrs.private_connection_resource_id?.value, res.address)));

    if (sc) {
      const def = sc.attrs.ip_restriction_default_action;
      const allows = subBlocks(sc, "ip_restriction").filter((r) => (model.str(r.attrs.action?.value) ?? "Allow") === "Allow");
      if (def && model.str(def.value) === "Deny") view.ipRestricted = { value: "ip_restriction_default_action = \"Deny\"", line: def.line };
      else if (allows.length) view.ipRestricted = { value: `${allows.length} ip_restriction allow rule(s)`, line: allows[0].line };
    }

    const ce = b.attrs.client_certificate_enabled;
    const cm = b.attrs.client_certificate_mode;
    if (ce || cm) view.clientCert = { enabled: model.bool(ce?.value), mode: model.str(cm?.value) ?? "Optional", line: (cm ?? ce)!.line };

    const v2 = first(subBlocks(b, "auth_settings_v2"));
    const v1 = first(subBlocks(b, "auth_settings"));
    if (v2) {
      // In v2, unauthenticated requests are let through unless require_authentication is true.
      const action = model.str(v2.attrs.unauthenticated_action?.value) ?? "RedirectToLoginPage";
      view.auth = { enabled: model.bool(v2.attrs.auth_enabled?.value), required: model.bool(v2.attrs.require_authentication?.value) === true, action, line: v2.line };
    } else if (v1) {
      const action = model.str(v1.attrs.unauthenticated_client_action?.value) ?? "RedirectToLoginPage";
      view.auth = { enabled: model.bool(v1.attrs.enabled?.value), required: action !== "AllowAnonymous", action, line: v1.line };
    }

    // Instance cap: site_config.app_scale_limit (Consumption / Premium), maximum_instance_count (Flex), or the plan's burst limit.
    const scale = sc?.attrs.app_scale_limit ?? b.attrs.maximum_instance_count;
    const scaleNum = scale && model.num(scale.value);
    if (scale && scaleNum !== undefined && scaleNum > 0) view.scaleLimit = { value: `${scale.name} = ${scaleNum}`, line: scale.line };
    const plan = model.resources.find((r) => r.type === "azurerm_service_plan" && references(b.attrs.service_plan_id?.value, r.address));
    const burst = plan?.block.attrs.maximum_elastic_worker_count;
    if (!view.scaleLimit && burst && model.num(burst.value)) view.scaleLimit = { value: `${plan!.address} caps elastic scale-out at ${model.num(burst.value)} workers`, line: burst.line };

    const sa = model.resolve(b.attrs.storage_account_name?.value);
    const m = sa?.t === "ref" ? /^(azurerm_storage_account\.[\w-]+)\./.exec(sa.path) : null;
    view.storageAccount = m?.[1];

    const settingsObj = model.resolve(b.attrs.app_settings?.value);
    const appSettings = settingsObj?.t === "obj" ? settingsObj.entries : {};
    view.appInsights =
      sc?.attrs.application_insights_connection_string?.line ??
      sc?.attrs.application_insights_key?.line ??
      (appSettings.APPLICATIONINSIGHTS_CONNECTION_STRING || appSettings.APPINSIGHTS_INSTRUMENTATIONKEY ? b.attrs.app_settings.line : undefined);
    view.keyVaultRefs = Object.values(appSettings).some((v) => /@Microsoft\.KeyVault\(/.test(rawText(v))) ? b.attrs.app_settings.line : undefined;

    for (const d of diagnostics) {
      if (!references(d.block.attrs.target_resource_id?.value, res.address)) continue;
      const { categories, groups } = categoriesOf(model, d);
      view.diagnostics.push({
        res: d,
        covers: categories.has("FunctionAppLogs") || groups.has("allLogs") || groups.has("audit"),
        storageDestination: d.block.attrs.storage_account_id?.value,
        destination: destinationOf(d.block),
      });
    }
    return view;
  });

  const activityLogExports = diagnostics.filter((d) => {
    const target = d.block.attrs.target_resource_id?.value;
    const t = rawText(target);
    const subscription = (target?.t === "ref" && target.path.startsWith("data.azurerm_subscription")) || (/\/subscriptions\//i.test(t) && !/providers\//i.test(t)) || /azurerm_subscription/.test(t);
    if (!subscription) return false;
    const { categories, groups } = categoriesOf(model, d);
    return categories.has("Administrative") || groups.has("allLogs") || groups.has("audit");
  });

  const rateLimitPolicy = ["azurerm_api_management_api_policy", "azurerm_api_management_policy", "azurerm_api_management_api_operation_policy"]
    .flatMap((t) => model.ofType(t))
    .find((p) => /<(rate-limit-by-key|rate-limit|quota-by-key)\b/.test(rawText(p.block.attrs.xml_content?.value)));

  return { model, buckets, settings, activityLogExports, rateLimitPolicy };
}

const { bucket, template } = ruleFactories<FunctionAppView, FunctionsView>();

// Network exposure ------------------------------------------------------------

const notPubliclyReachable = bucket((a) => {
  const p = a.publicAccess;
  if (p?.value === false) {
    const via = a.privateEndpoint ? ` It's reached through ${a.privateEndpoint.address}.` : "";
    return pass(`public_network_access_enabled = false, so the app's public endpoint refuses internet traffic.${via}`, p.line);
  }
  if (a.privateEndpoint) {
    return warn(`${a.privateEndpoint.address} gives the app a private endpoint, but public network access isn't disabled, so the public hostname still answers. Set public_network_access_enabled = false.`, p?.line ?? a.privateEndpoint.block.line);
  }
  if (a.ipRestricted) return warn(`Inbound traffic is limited by ${a.ipRestricted.value}, but the app still has a public endpoint.`, a.ipRestricted.line);
  if (p?.value === true) return fail("public_network_access_enabled = true and no private endpoint or IP restrictions, so the app is reachable from the internet.", p.line);
  return fail("public_network_access_enabled isn't set to false (the azurerm provider defaults to true), and there's no private endpoint or IP restriction.", a.res.block.line);
});

// Rate limiting ---------------------------------------------------------------

const invocationRateLimited = bucket((a, t) => {
  if (a.scaleLimit) return pass(`Scale-out is capped (${a.scaleLimit.value}), which bounds how many invocations run at once.`, a.scaleLimit.line);
  if (t.rateLimitPolicy) return pass(`${t.rateLimitPolicy.address} applies an API Management rate-limit policy to callers.`, t.rateLimitPolicy.block.line);
  return warn(
    "No app_scale_limit, maximum_instance_count or API Management rate limit, so the app scales to the plan's default ceiling (e.g. 200 instances on Consumption) rather than a limit you've chosen.",
    a.res.block.line,
  );
});

// Encryption in transit -------------------------------------------------------

const minimumTls13 = bucket((a) => {
  const v = a.minTls?.value;
  if (v === "1.3") return pass("site_config.minimum_tls_version is 1.3.", a.minTls!.line);
  if (v === "1.0" || v === "1.1") return fail(`minimum_tls_version is ${v}, which allows deprecated TLS versions.`, a.minTls!.line);
  if (v === "1.2") return warn("The minimum TLS version is 1.2, but the requirement asks for 1.3. Set minimum_tls_version = \"1.3\".", a.minTls!.line);
  return warn("site_config.minimum_tls_version isn't set. It defaults to 1.2, below the TLS 1.3 the requirement asks for.", a.res.block.line);
});

const httpsOnly = bucket((a) => {
  const h = a.httpsOnly;
  if (h?.value === true) return pass("https_only = true, so plain HTTP requests are redirected to HTTPS.", h.line);
  if (h?.value === false) return fail("https_only = false, so the app serves plain HTTP.", h.line);
  return fail("https_only isn't set. The azurerm provider defaults it to false, so the app serves plain HTTP.", a.res.block.line);
});

const mutualTls = bucket((a) => {
  const c = a.clientCert;
  if (c?.enabled && c.mode === "Required") return pass("client_certificate_mode = \"Required\": callers must present a client certificate (mTLS).", c.line);
  if (c?.enabled) return warn(`Client certificates are enabled but the mode is "${c.mode}", so callers can connect without one.`, c.line);
  return fail("client_certificate_enabled isn't true, so callers don't need a client certificate (no mTLS).", c?.line ?? a.res.block.line);
});

// Encryption at rest ----------------------------------------------------------

const encryptionAtRest = bucket((a) => {
  if (a.keyVaultRefs) return pass("Secrets in app settings are Key Vault references; App Service always encrypts the remaining settings at rest.", a.keyVaultRefs);
  return pass("App Service always encrypts app settings and connection strings at rest; it can't be turned off. Prefer Key Vault references for secrets.", a.res.block.line);
});

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template((t) => {
  const d = t.activityLogExports[0];
  if (d) return pass(`${d.address} exports the subscription Activity Log (management events) for long-term retention.`, d.block.line);
  return fail("The Activity Log only keeps management events for 90 days, and no diagnostic setting exports it (Administrative category) from the subscription.");
});

const invocationsLogged = bucket((a) => {
  const good = a.diagnostics.find((d) => d.covers);
  if (good) return pass(`${good.res.address} sends FunctionAppLogs (each invocation and its result) to ${good.destination ?? "a destination"}.`, good.res.block.line);
  if (a.diagnostics.length) return warn(`${a.diagnostics[0].res.address} targets the app but doesn't enable the FunctionAppLogs category.`, a.diagnostics[0].res.block.line);
  if (a.appInsights) {
    return warn("Application Insights records invocations, but it samples telemetry by default, so not every request is guaranteed to be logged. Add a diagnostic setting for FunctionAppLogs.", a.appInsights);
  }
  return fail("No diagnostic setting or Application Insights, so invocations aren't logged.", a.res.block.line);
});

const logsSeparatedFromResource = bucket((a) => {
  const self = a.storageAccount && a.diagnostics.find((d) => references(d.storageDestination, a.storageAccount!));
  if (self) return fail(`${self.res.address} writes logs into ${a.storageAccount}, the storage account the app itself uses, so the app's own credentials can reach its logs.`, self.res.block.line);
  const d = a.diagnostics[0];
  if (d) return pass(`Logs go to ${d.destination ?? "a separate destination"}, outside the function app.`, d.res.block.line);
  if (a.appInsights) return pass("Telemetry goes to Application Insights, outside the function app.", a.appInsights);
  return na("No logs are configured for this function app (see CCC.Core.CN04).");
});

// Access ----------------------------------------------------------------------

const noAnonymousInvocation = bucket((a) => {
  const au = a.auth;
  if (au?.enabled && au.required) return pass(`App Service authentication is on and unauthenticated requests are rejected (${au.action}).`, au.line);
  if (au?.enabled) return warn("App Service authentication is on but allows anonymous requests, so access depends on each trigger's auth level (set in code).", au.line);
  return warn(
    "No App Service authentication. Whether HTTP triggers need a function key depends on their authLevel, which is set in code and isn't visible here; confirm with a live test.",
    au?.line ?? a.res.block.line,
  );
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((a, t) => {
  const line = a.res.block.attrs.location?.line ?? a.res.block.line;
  if (!a.location) return warn("The location is unknown or computed at apply time.", line);
  if (isTrusted(a.location, t.settings)) return pass(`Deployed to ${a.location}, which is in the trusted list.`, line);
  return fail(`Deployed to ${a.location}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) =>
  locationsTrusted(t, "azurerm_", "Azure", (r) => (r.block.attrs.location ? azureLocation(t.model, r.block.attrs.location.value) : null)),
);

// ── Registry ──────────────────────────────────────────────────────────────────

export const azure: ProviderRules<FunctionAppView, FunctionsView> = {
  id: "azure",
  label: "Azure",
  prefix: "azurerm_",
  noun: { one: "function app", many: "function apps" },
  build: buildFunctionsView,
  rules: {
    "CCC.Core.CN01.AR01": minimumTls13,
    "CCC.Core.CN01.AR03": httpsOnly,
    "CCC.Core.CN01.AR08": mutualTls,
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

    "CCC.SvlsComp.CN01.AR01": notPubliclyReachable,
    "CCC.SvlsComp.CN02.AR01": invocationRateLimited,
  },
};
