/**
 * Static rules mapping Cloud Run functions Terraform (google provider) to CCC
 * assessment requirements for CCC.SvlsComp and the CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * Cloud Run functions (google_cloudfunctions2_function), 1st-gen Cloud Functions
 * and Cloud Run services are all treated as functions. Rules only see what the
 * template declares; IAM granted at project or folder level, organisation
 * policies created elsewhere and function code are invisible. The authoritative
 * checks are the behavioural tests in modules/features.
 */

import type { HclBlock } from "../../hcl/parser";
import { references, subBlocks, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { fail, first, gcpLocation, gcpProviderRegion, isTrusted, locationsTrusted, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

interface Located<T> {
  value: T;
  line: number;
}

type Kind = "gen2" | "gen1" | "run";

export interface GcpFunctionView {
  res: TfResource;
  kind: Kind;
  name?: string;
  location?: Located<string | undefined>;
  /** Ingress normalised to "all", "internal" or "internal-and-lb", with the raw value for messages. */
  ingress?: Located<{ level: "all" | "internal" | "internal-and-lb"; raw: string }>;
  maxInstances?: Located<number | undefined>;
  concurrency?: number;
  kmsKey?: number;
  /** 1st gen only: SECURE_ALWAYS / SECURE_OPTIONAL. */
  httpsSecurity?: Located<string | undefined>;
  publicInvokers: Located<string>[];
}

export interface GcpView extends BaseView<GcpFunctionView> {
  auditConfigs: { service: string; types: Set<string>; line: number }[];
}

const KINDS: Record<string, Kind> = {
  google_cloudfunctions2_function: "gen2",
  google_cloudfunctions_function: "gen1",
  google_cloud_run_v2_service: "run",
};

const IAM_TYPES = [
  "google_cloudfunctions2_function_iam_member",
  "google_cloudfunctions2_function_iam_binding",
  "google_cloudfunctions_function_iam_member",
  "google_cloudfunctions_function_iam_binding",
  "google_cloud_run_service_iam_member",
  "google_cloud_run_service_iam_binding",
  "google_cloud_run_v2_service_iam_member",
  "google_cloud_run_v2_service_iam_binding",
];

const PUBLIC_MEMBERS = ["allUsers", "allAuthenticatedUsers"];

const AUDITED_SERVICES = ["cloudfunctions.googleapis.com", "run.googleapis.com", "allServices"];

function normaliseIngress(raw: string): "all" | "internal" | "internal-and-lb" {
  if (/INTERNAL_ONLY$/.test(raw)) return "internal";
  if (/INTERNAL_AND_GCLB$|INTERNAL_LOAD_BALANCER$/.test(raw)) return "internal-and-lb";
  return "all";
}

export function buildGcpView(model: TfModel, settings: LabsSettings): GcpView {
  const providerRegion = gcpProviderRegion(model);

  const buckets = Object.keys(KINDS)
    .flatMap((t) => model.ofType(t))
    .map((res): GcpFunctionView => {
      const b = res.block;
      const kind = KINDS[res.type];
      const name = model.str(b.attrs.name?.value);
      const num = (blk: HclBlock | undefined, key: string): Located<number | undefined> | undefined => {
        const a = blk?.attrs[key];
        return a ? { value: model.num(a.value), line: a.line } : undefined;
      };

      const view: GcpFunctionView = { res, kind, name, publicInvokers: [] };

      const locAttr = b.attrs.location ?? b.attrs.region;
      view.location = locAttr ? { value: locationOf(model, res) ?? undefined, line: locAttr.line } : providerRegion ? { value: providerRegion, line: b.line } : undefined;

      let ingressAttr;
      if (kind === "gen2") {
        const sc = first(subBlocks(b, "service_config"));
        ingressAttr = sc?.attrs.ingress_settings;
        view.maxInstances = num(sc, "max_instance_count");
        view.concurrency = model.num(sc?.attrs.max_instance_request_concurrency?.value);
        view.kmsKey = b.attrs.kms_key_name?.line;
      } else if (kind === "gen1") {
        ingressAttr = b.attrs.ingress_settings;
        view.maxInstances = num(b, "max_instances");
        view.kmsKey = b.attrs.kms_key_name?.line;
        const h = b.attrs.https_trigger_security_level;
        view.httpsSecurity = h ? { value: model.str(h.value), line: h.line } : undefined;
      } else {
        ingressAttr = b.attrs.ingress;
        const tpl = first(subBlocks(b, "template"));
        view.maxInstances = num(first(subBlocks(tpl ?? b, "scaling")), "max_instance_count") ?? num(first(subBlocks(b, "scaling")), "max_instance_count");
        view.concurrency = model.num(tpl?.attrs.max_instance_request_concurrency?.value);
        view.kmsKey = tpl?.attrs.encryption_key?.line;
      }
      if (ingressAttr) {
        const raw = model.str(ingressAttr.value) ?? "computed";
        view.ingress = { value: { level: normaliseIngress(raw), raw }, line: ingressAttr.line };
      }

      // IAM grants on this function (or the Cloud Run service behind it) to everyone.
      for (const r of IAM_TYPES.flatMap((t) => model.ofType(t))) {
        const a = r.block.attrs;
        const target = [a.cloud_function, a.service, a.name].some((v) => references(v?.value, res.address) || (!!name && model.str(v?.value) === name));
        if (!target) continue;
        const members = [...model.strList(a.members?.value), ...(a.member ? [model.str(a.member.value) ?? ""] : [])];
        const open = members.find((m) => PUBLIC_MEMBERS.includes(m));
        if (open) view.publicInvokers.push({ value: `${r.address} grants ${model.str(a.role?.value) ?? "a role"} to "${open}"`, line: (a.member ?? a.members)!.line });
      }
      return view;
    });

  const auditConfigs = ["google_project_iam_audit_config", "google_folder_iam_audit_config", "google_organization_iam_audit_config"]
    .flatMap((t) => model.ofType(t))
    .map((r) => ({
      service: model.str(r.block.attrs.service?.value) ?? "",
      types: new Set(subBlocks(r.block, "audit_log_config").map((c) => model.str(c.attrs.log_type?.value) ?? "")),
      line: r.block.line,
    }))
    .filter((c) => AUDITED_SERVICES.includes(c.service));

  return { model, buckets, settings, auditConfigs };
}

const { bucket, template } = ruleFactories<GcpFunctionView, GcpView>();

// Network exposure ------------------------------------------------------------

const notPubliclyReachable = bucket((f) => {
  const i = f.ingress;
  const attr = f.kind === "run" ? "ingress" : "ingress_settings";
  if (i?.value.level === "internal") return pass(`${attr} is ${i.value.raw}, so requests from the public internet are refused.`, i.line);
  if (i?.value.level === "internal-and-lb") {
    return warn(`${attr} is ${i.value.raw}: traffic must come through the VPC or a Google Cloud load balancer, which may itself be internet-facing.`, i.line);
  }
  if (i) return fail(`${attr} is ${i.value.raw}, so the function's URL accepts requests from the internet.`, i.line);
  return fail(`${attr} isn't set; it defaults to allowing all traffic, so the function's URL accepts requests from the internet.`, f.res.block.line);
});

// Rate limiting ---------------------------------------------------------------

const invocationRateLimited = bucket((f) => {
  const m = f.maxInstances;
  if (m?.value !== undefined && m.value > 0) {
    const c = f.concurrency ?? (f.kind === "gen1" ? 1 : undefined);
    const total = c ? ` × ${c} concurrent request(s) each = at most ${m.value * c} in flight; excess requests get 429` : "";
    return pass(`Scale-out is capped at ${m.value} instance(s)${total}.`, m.line);
  }
  return warn(
    "No maximum instance count, so the function scales to the platform default (100 instances for Cloud Run functions) rather than a limit you've chosen.",
    m?.line ?? f.res.block.line,
  );
});

// Encryption ------------------------------------------------------------------

const encryptionInTransit = bucket((f) => {
  if (f.kind !== "gen1") return pass("Cloud Run endpoints only serve HTTPS; plain HTTP requests are redirected to HTTPS.", f.res.block.line);
  const h = f.httpsSecurity;
  if (h?.value === "SECURE_ALWAYS") return pass("https_trigger_security_level is SECURE_ALWAYS, so HTTP requests are redirected to HTTPS.", h.line);
  if (h) return fail(`https_trigger_security_level is ${h.value ?? "computed"}, so the trigger also serves plain HTTP.`, h.line);
  return warn("https_trigger_security_level isn't set. Pin it to SECURE_ALWAYS so plain HTTP is always redirected.", f.res.block.line);
});

const encryptionAtRest = bucket((f) => {
  if (f.kmsKey) return pass("The function's code and environment are encrypted with a customer-managed Cloud KMS key (CMEK).", f.kmsKey);
  return pass("Google Cloud always encrypts function code and configuration at rest (with Google-managed keys unless a CMEK is set); it can't be turned off.", f.res.block.line);
});

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template(() =>
  pass("Admin Activity audit logs are always written for function and Cloud Run configuration changes and can't be turned off; they're kept for 400 days."),
);

function invocationsLogged(type: "DATA_WRITE" | "DATA_READ") {
  return bucket((f, t) => {
    const audit = t.auditConfigs.find((c) => c.types.has(type));
    if (audit) return pass(`Data Access audit logs (${type}) are enabled for ${audit.service}, recording caller identity, time and result.`, audit.line);
    return fail(
      `Data Access audit logs (${type}) are off by default and no google_project_iam_audit_config enables them for run.googleapis.com or cloudfunctions.googleapis.com. Request logs don't record the caller's identity.`,
      f.res.block.line,
    );
  });
}

const logsSeparatedFromResource = bucket((f) =>
  pass("Function logs and audit logs are written to Cloud Logging, outside the function; the function can't read them unless its service account is granted logging access.", f.res.block.line),
);

// Access ----------------------------------------------------------------------

const noAnonymousInvocation = bucket((f) => {
  const open = f.publicInvokers[0];
  if (open) return fail(`${open.value}, so unauthenticated callers can invoke the function.`, open.line);
  return pass("No invoker role is granted to allUsers or allAuthenticatedUsers, so every invocation must carry an identity token that IAM authorises.", f.res.block.line);
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((f, t) => {
  const loc = f.location;
  if (!loc?.value) return warn("The location is unknown or computed at apply time.", loc?.line ?? f.res.block.line);
  if (isTrusted(loc.value, t.settings)) return pass(`Deployed to ${loc.value}, which is in the trusted list.`, loc.line);
  return fail(`Deployed to ${loc.value}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, loc.line);
});

/** gcpLocation, also following `location = google_x.y.location` (common on IAM members for a function's service). */
function locationOf(model: TfModel, r: TfResource, depth = 0): string | null | undefined {
  const v = model.resolve(r.block.attrs.location?.value ?? r.block.attrs.region?.value);
  const m = v?.t === "ref" ? /^(\w+)\.([\w-]+)\.(location|region)$/.exec(v.path) : null;
  const target = m && depth < 5 ? model.find("resource", m[1], m[2]) : undefined;
  return target ? locationOf(model, target, depth + 1) : gcpLocation(model, r);
}

const childRegionsTrusted = template((t) => locationsTrusted(t, "google_", "Google Cloud", (r) => locationOf(t.model, r)));

// ── Registry ──────────────────────────────────────────────────────────────────

export const gcp: ProviderRules<GcpFunctionView, GcpView> = {
  id: "gcp",
  label: "Google Cloud",
  prefix: "google_",
  noun: { one: "function", many: "functions" },
  build: buildGcpView,
  rules: {
    // CCC.Core.CN01.AR01 (TLS 1.3): Google front ends also accept TLS 1.2 and functions have no setting for it: live test only.
    "CCC.Core.CN01.AR03": encryptionInTransit,
    "CCC.Core.CN02.AR01": encryptionAtRest,
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN04.AR02": invocationsLogged("DATA_WRITE"),
    "CCC.Core.CN04.AR03": invocationsLogged("DATA_READ"),
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
