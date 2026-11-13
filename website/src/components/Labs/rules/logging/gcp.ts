/**
 * Static rules mapping Google Cloud Logging Terraform (log buckets, sinks, audit configs,
 * VPC flow logs, log-based metrics and alert policies, and the Cloud Storage buckets that
 * sinks archive to) to CCC assessment requirements for the CCC.Logging catalog and the
 * CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see sinks, exclusions or IAM granted elsewhere in
 * the resource hierarchy, or how the service behaves at runtime.
 *
 * The primary resources ("log stores") are Cloud Logging buckets and the Cloud Storage
 * buckets that a sink writes into. Routing, flow logs and alerting are template-wide.
 * Requirements without a rule are shown as "Live test only" in the UI.
 */

import type { HclBlock, HclValue } from "../../hcl/parser";
import { references, subBlocks, textOf, type TfModel, type TfResource } from "../../terraform/model";
import type { Evidence, LabsSettings } from "../../types";
import { fail, first, gcpLocation, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

// ── View ──────────────────────────────────────────────────────────────────────

interface Located<T> {
  value: T;
  line: number;
}

export interface GcpLogStoreView {
  res: TfResource;
  kind: "log-bucket" | "storage";
  location?: Located<string | undefined>;
  /** Addresses of the sinks that write into this store. */
  sources: string[];
  /** Log buckets: retention_days (absent = the 30-day default). Storage: lifecycle Delete age. */
  retentionDays?: Located<number | undefined>;
  /** Storage: bucket retention policy, in days. */
  retentionPolicy?: { days?: number; locked: boolean; line: number };
  /** Log buckets: `locked`. */
  locked?: Located<boolean | undefined>;
  cmk?: number;
  publicAccessPrevention?: Located<string | undefined>;
  publicMembers: Located<string>[];
}

interface Sink {
  res: TfResource;
  scope: "organization" | "folder" | "project" | "billing";
  filter?: string;
  includeChildren: boolean;
  disabled: boolean;
}

export interface GcpLoggingView extends BaseView<GcpLogStoreView> {
  sinks: Sink[];
  subnets: TfResource[];
  metrics: { res: TfResource; name?: string; filter: string }[];
  alerts: { res: TfResource; text: string; channels: boolean }[];
  dataReadAudited?: number;
}

const LOG_BUCKETS = ["google_logging_project_bucket_config", "google_logging_folder_bucket_config", "google_logging_organization_bucket_config", "google_logging_billing_account_bucket_config"];
const SINKS: [string, Sink["scope"]][] = [
  ["google_logging_organization_sink", "organization"],
  ["google_logging_folder_sink", "folder"],
  ["google_logging_project_sink", "project"],
  ["google_logging_billing_account_sink", "billing"],
];
const PUBLIC_MEMBERS = ["allUsers", "allAuthenticatedUsers"];
const COMPUTE = ["google_compute_instance", "google_cloudfunctions_function", "google_cloudfunctions2_function", "google_cloud_run_v2_service", "google_cloud_run_service"];
const LOG_BUCKET_DEFAULT_RETENTION = 30;

function flatText(model: TfModel, v: HclValue | undefined): string {
  const r = model.resolve(v);
  if (!r) return "";
  switch (r.t) {
    case "list":
      return r.items.map((i) => flatText(model, i)).join(" ");
    case "obj":
      return Object.entries(r.entries)
        .map(([k, e]) => `${k} ${flatText(model, e)}`)
        .join(" ");
    case "call":
      return r.args.map((a) => flatText(model, a)).join(" ");
    default:
      return textOf(r);
  }
}

/** All attribute text in a block and its nested blocks. */
function blockText(model: TfModel, b: HclBlock): string {
  return [...Object.values(b.attrs).map((a) => flatText(model, a.value)), ...b.blocks.map((x) => blockText(model, x))].join(" ");
}

function buildView(model: TfModel, settings: LabsSettings): GcpLoggingView {
  const sinks: Sink[] = SINKS.flatMap(([type, scope]) =>
    model.ofType(type).map((res) => ({
      res,
      scope,
      filter: res.block.attrs.filter ? (model.str(res.block.attrs.filter.value) ?? flatText(model, res.block.attrs.filter.value)) : undefined,
      includeChildren: model.bool(res.block.attrs.include_children?.value) === true,
      disabled: model.bool(res.block.attrs.disabled?.value) === true,
    })),
  );
  const feeding = (res: TfResource) => sinks.filter((s) => references(s.res.block.attrs.destination?.value, res.address)).map((s) => s.res.address);
  const loc = (res: TfResource): Located<string | undefined> | undefined => {
    const a = res.block.attrs.location;
    return a ? { value: model.str(a.value), line: a.line } : undefined;
  };

  const logBuckets = LOG_BUCKETS.flatMap((t) => model.ofType(t)).map((res): GcpLogStoreView => {
    const a = res.block.attrs;
    const cmek = first(subBlocks(res.block, "cmek_settings"));
    return {
      res,
      kind: "log-bucket",
      location: loc(res),
      sources: feeding(res),
      retentionDays: a.retention_days ? { value: model.num(a.retention_days.value), line: a.retention_days.line } : undefined,
      locked: a.locked ? { value: model.bool(a.locked.value), line: a.locked.line } : undefined,
      cmk: cmek?.attrs.kms_key_name ? cmek.line : undefined,
      publicMembers: [],
    };
  });

  const storage: GcpLogStoreView[] = [];
  for (const res of model.ofType("google_storage_bucket")) {
    const sources = feeding(res);
    // Only buckets a sink writes into are log stores; the rest belong to the object-storage service.
    if (!sources.length) continue;
    const b = res.block;
    const name = model.str(b.attrs.name?.value);
    const linked = (type: string) => model.ofType(type).filter((r) => references(r.block.attrs.bucket?.value, res.address) || (name !== undefined && model.str(r.block.attrs.bucket?.value) === name));
    const view: GcpLogStoreView = { res, kind: "storage", location: loc(res), sources, publicMembers: [] };
    const ret = first(subBlocks(b, "retention_policy"));
    if (ret) {
      const secs = model.num(ret.attrs.retention_period?.value);
      view.retentionPolicy = { days: secs !== undefined ? Math.floor(secs / 86400) : undefined, locked: model.bool(ret.attrs.is_locked?.value) === true, line: ret.line };
    }
    for (const rule of subBlocks(b, "lifecycle_rule")) {
      if (!subBlocks(rule, "action").some((a) => model.str(a.attrs.type?.value) === "Delete")) continue;
      for (const c of subBlocks(rule, "condition")) {
        const age = model.num(c.attrs.age?.value);
        if (age !== undefined && (view.retentionDays?.value === undefined || age < view.retentionDays.value)) view.retentionDays = { value: age, line: c.attrs.age!.line };
      }
    }
    const enc = first(subBlocks(b, "encryption"));
    if (enc?.attrs.default_kms_key_name) view.cmk = enc.line;
    if (b.attrs.public_access_prevention) view.publicAccessPrevention = { value: model.str(b.attrs.public_access_prevention.value), line: b.attrs.public_access_prevention.line };
    for (const m of linked("google_storage_bucket_iam_member")) {
      const member = model.str(m.block.attrs.member?.value);
      if (member && PUBLIC_MEMBERS.includes(member)) view.publicMembers.push({ value: member, line: m.block.line });
    }
    for (const m of linked("google_storage_bucket_iam_binding")) {
      const member = model.strList(m.block.attrs.members?.value).find((x) => PUBLIC_MEMBERS.includes(x));
      if (member) view.publicMembers.push({ value: member, line: m.block.line });
    }
    storage.push(view);
  }

  const metrics = model.ofType("google_logging_metric").map((res) => ({
    res,
    name: model.str(res.block.attrs.name?.value),
    filter: model.str(res.block.attrs.filter?.value) ?? flatText(model, res.block.attrs.filter?.value),
  }));

  const alerts = model.ofType("google_monitoring_alert_policy").map((res) => ({
    res,
    text: subBlocks(res.block, "conditions")
      .map((c) => blockText(model, c))
      .join(" "),
    channels: !!res.block.attrs.notification_channels,
  }));

  const audit = ["google_project_iam_audit_config", "google_folder_iam_audit_config", "google_organization_iam_audit_config"]
    .flatMap((t) => model.ofType(t))
    .find(
      (r) =>
        ["logging.googleapis.com", "allServices"].includes(model.str(r.block.attrs.service?.value) ?? "") &&
        subBlocks(r.block, "audit_log_config").some((c) => model.str(c.attrs.log_type?.value) === "DATA_READ"),
    );

  return {
    model,
    settings,
    buckets: [...logBuckets, ...storage],
    sinks,
    subnets: model.ofType("google_compute_subnetwork"),
    metrics,
    alerts,
    dataReadAudited: audit?.block.line,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<GcpLogStoreView, GcpLoggingView>();

const SEVERITY: Record<Evidence["status"], number> = { na: 0, pass: 1, manual: 2, warn: 3, fail: 4 };
const worstOf = (evs: Evidence[]): Evidence => evs.reduce((a, e) => (SEVERITY[e.status] > SEVERITY[a.status] ? e : a));
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

const activeSinks = (t: GcpLoggingView) => t.sinks.filter((s) => !s.disabled);
const routes = (s: Sink, logName: string) => s.filter === undefined || s.filter.trim() === "" || s.filter.includes(logName);
const hierarchical = (s: Sink) => (s.scope === "organization" || s.scope === "folder") && s.includeChildren;

/** Alert policies that notify someone and match `events` directly (log-match) or through a log-based metric. */
function alertsOn(t: GcpLoggingView, events: string[]) {
  const metrics = t.metrics.filter((m) => events.some((e) => m.filter.includes(e)));
  return t.alerts
    .filter((a) => a.channels)
    .map((a) => {
      const viaMetric = metrics.find((m) => a.text.includes(m.res.address) || (m.name && a.text.includes(`logging.googleapis.com/user/${m.name}`)));
      const covered = events.filter((e) => a.text.includes(e) || viaMetric?.filter.includes(e));
      return { alert: a, viaMetric, covered };
    })
    .filter((x) => x.covered.length);
}

// ── Rules: collection ─────────────────────────────────────────────────────────

const auditAndFlowLogsCentralised = template((t) => {
  const audit = activeSinks(t).filter((s) => routes(s, "cloudaudit.googleapis.com"));
  if (!audit.length) {
    return fail("No sink routes audit logs (cloudaudit.googleapis.com) to a central bucket, so they stay in each project's _Required and _Default buckets.");
  }
  const sink = audit.find(hierarchical) ?? audit[0];
  const evs: Evidence[] = [];
  if (!hierarchical(sink)) {
    evs.push(warn(`${sink.res.address} only routes this ${sink.scope}'s logs; new projects aren't covered. Use an organisation or folder sink with include_children = true.`, sink.res.block.line));
  }
  const bare = t.subnets.find((s) => !subBlocks(s.block, "log_config").length);
  if (bare) evs.push(fail(`${bare.address} has no log_config, so its VPC flow logs are off.`, bare.block.line));
  else if (!t.subnets.length) evs.push(warn("No subnetworks in this template, so VPC flow logging can't be confirmed (flow logs are enabled per subnet)."));
  else if (!activeSinks(t).some((s) => routes(s, "vpc_flows"))) {
    evs.push(warn("Subnets record flow logs, but no sink routes compute.googleapis.com/vpc_flows to the central bucket.", t.subnets[0].block.line));
  }
  evs.push(pass(`${sink.res.address} routes audit logs${t.subnets.length ? " and VPC flow logs" : ""} from every project under it to a central bucket.`, sink.res.block.line));
  return worstOf(evs);
});

const computeForwardsLogs = template((t) => {
  const compute = t.model.resources.filter((r) => r.mode === "resource" && COMPUTE.includes(r.type));
  if (!compute.length) return na("No compute resources (VM instances, Cloud Run services, functions) in this template.");
  const opsPolicy = first(t.model.ofType("google_os_config_os_policy_assignment"));
  const evs = compute.map((r): Evidence => {
    if (r.type !== "google_compute_instance") return pass(`${r.address} writes its stdout, stderr and request logs to Cloud Logging automatically.`, r.block.line);
    if (opsPolicy) return pass(`${opsPolicy.address} installs the Ops Agent, which forwards ${r.address}'s OS and application logs.`, opsPolicy.block.line);
    return warn(`${r.address} needs the Ops Agent to forward OS and application logs; it isn't installed in this template.`, r.block.line);
  });
  return worstOf(evs);
});

const adminActionsLogged = template(() =>
  pass("Admin Activity audit logs always record changes to sinks, buckets and flow-log settings; they can't be turned off and are kept for 400 days."),
);

// ── Rules: retention ──────────────────────────────────────────────────────────

const retentionMeetsPolicy = bucket((s, t) => {
  const min = t.settings.minLogRetentionDays;
  if (s.kind === "log-bucket") {
    const d = s.retentionDays ? s.retentionDays.value : LOG_BUCKET_DEFAULT_RETENTION;
    const line = s.retentionDays?.line ?? s.res.block.line;
    if (d === undefined) return warn("retention_days is computed, so the retention period can't be checked.", line);
    if (d < min) return fail(`Logs are kept for ${days(d)}${s.retentionDays ? "" : " (the default)"}, below the ${min}-day retention policy.`, line);
    return pass(`Logs are kept for ${days(d)} (policy: at least ${days(min)}).`, line);
  }
  const del = s.retentionDays?.value;
  const rp = s.retentionPolicy;
  if (del !== undefined && del < min) return fail(`A lifecycle rule deletes log files after ${days(del)}, below the ${min}-day retention policy.`, s.retentionDays!.line);
  if (rp?.days !== undefined && rp.days >= min) return pass(`The bucket retention policy keeps every log file for ${days(rp.days)} (policy: at least ${days(min)}).`, rp.line);
  if (del !== undefined) return pass(`A lifecycle rule keeps log files for ${days(del)} before deleting them (policy: at least ${days(min)}).`, s.retentionDays!.line);
  return warn("No lifecycle Delete rule or retention policy, so retention isn't enforced: log files stay until someone deletes them.", s.res.block.line);
});

const expiredLogsRemoved = bucket((s, t) => {
  const min = t.settings.minLogRetentionDays;
  const d = s.kind === "log-bucket" ? (s.retentionDays ? s.retentionDays.value : LOG_BUCKET_DEFAULT_RETENTION) : s.retentionDays?.value;
  const line = s.retentionDays?.line ?? s.res.block.line;
  if (s.kind === "storage" && !s.retentionDays) return fail(`No lifecycle Delete rule, so log files older than ${days(min)} are never removed.`, line);
  if (d === undefined) return warn("The retention period is computed, so it can't be checked.", line);
  if (d > min) return warn(`Logs are kept for ${days(d)}, so queries for entries between ${days(min)} and ${days(d)} old still return results.`, line);
  return pass(`Logs are deleted after ${days(d)}, so nothing older than the retention period can be queried.`, line);
});

// ── Rules: immutability ───────────────────────────────────────────────────────

const logsImmutable = bucket((s) => {
  if (s.kind === "log-bucket") {
    if (s.locked?.value) return pass("The log bucket is locked: its retention can't be reduced and it can't be deleted, and log entries can't be edited, so nothing is removed early.", s.locked.line);
    return fail("The log bucket isn't locked (locked = true), so its retention can be shortened or the bucket deleted, removing logs early.", s.locked?.line ?? s.res.block.line);
  }
  const rp = s.retentionPolicy;
  if (!rp) return fail("No retention policy, so log files can be overwritten or deleted.", s.res.block.line);
  if (rp.locked) return pass("A locked retention policy stops any log file being deleted or replaced before it expires.", rp.line);
  return warn("The retention policy isn't locked (is_locked = true), so it can be removed or shortened.", rp.line);
});

// ── Rules: access ─────────────────────────────────────────────────────────────

const notPublic = bucket((s) => {
  if (s.kind === "log-bucket") return pass("Log buckets can't be made public: reading them always needs a Cloud Logging IAM role.", s.res.block.line);
  const pub = s.publicMembers[0];
  if (pub) return fail(`An IAM binding grants ${pub.value} access to the log archive.`, pub.line);
  const pap = s.publicAccessPrevention;
  if (pap?.value === "enforced") return pass('public_access_prevention is "enforced", so the log archive can never be made public.', pap.line);
  return warn('public_access_prevention isn\'t "enforced", so the bucket relies on the organisation policy to stay private.', pap?.line ?? s.res.block.line);
});

// ── Rules: encryption ─────────────────────────────────────────────────────────

const encryptionAtRest = bucket((s) => {
  if (s.cmk !== undefined) return pass("Logs are encrypted at rest with a customer-managed Cloud KMS key (CMEK).", s.cmk);
  return pass(`${s.kind === "log-bucket" ? "Cloud Logging" : "Cloud Storage"} always encrypts data at rest (with Google-managed keys unless a CMEK is set).`, s.res.block.line);
});

const customerManagedKey = bucket((s) => {
  if (s.cmk !== undefined) return pass("Logs are encrypted with a customer-managed Cloud KMS key.", s.cmk);
  return fail(s.kind === "log-bucket" ? "No cmek_settings, so the log bucket uses Google-managed keys." : "No encryption.default_kms_key_name, so the log archive uses Google-managed keys.", s.res.block.line);
});

// ── Rules: location ───────────────────────────────────────────────────────────

const regionTrusted = bucket((s, t) => {
  const l = s.location;
  const line = l?.line ?? s.res.block.line;
  if (!l?.value) return warn("The location is unknown or computed at apply time.", line);
  if (l.value === "global") return fail('Stored in "global", so log data can be held in any Google Cloud region. Pick a trusted region.', line);
  if (isTrusted(l.value, t.settings)) return pass(`Stored in ${l.value}, which is in the trusted list.`, line);
  return fail(`Stored in ${l.value}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "google_", "Google Cloud", (r) => gcpLocation(t.model, r)));

const forwardingInPerimeter = template((t) => {
  const sinks = activeSinks(t);
  if (!sinks.length) return na("No sinks route logs to another destination.");
  for (const s of sinks) {
    const dest = t.buckets.find((b) => references(s.res.block.attrs.destination?.value, b.res.address));
    if (!dest) return warn(`${s.res.address} routes logs to a destination outside this template, so its location can't be checked.`, s.res.block.attrs.destination?.line ?? s.res.block.line);
    const l = dest.location?.value;
    if (!l || l === "global" || !isTrusted(l, t.settings)) return fail(`${s.res.address} routes logs to ${dest.res.address} in ${l ?? "an unknown location"}, outside the trusted list.`, s.res.block.line);
  }
  return pass("Every sink routes logs to a destination in a trusted location.", sinks[0].res.block.line);
});

// ── Rules: alerting and tamper resistance ─────────────────────────────────────

const TAMPER_EVENTS = ["DeleteSink", "UpdateSink", "DeleteBucket", "UpdateBucket", "CreateExclusion", "UpdateExclusion"];

const queryAnomalyAlert = template((t) => {
  const hits = alertsOn(t, ["ListLogEntries"]);
  const metric = t.metrics.find((m) => m.filter.includes("ListLogEntries"));
  if (!hits.length) {
    if (metric) return fail(`${metric.res.address} counts log reads, but no alert policy with notification channels watches it.`, metric.res.block.line);
    return fail("No log-based metric and alert policy count log reads (ListLogEntries), so a principal running an unusual number of queries isn't alerted on.");
  }
  const h = hits[0];
  if (t.dataReadAudited === undefined) {
    return warn(`${h.alert.res.address} alerts on log reads, but Data Access (DATA_READ) audit logs for logging.googleapis.com aren't enabled here, so there's nothing to count.`, h.alert.res.block.line);
  }
  return pass(`${h.alert.res.address} alerts when log reads (ListLogEntries) cross its threshold.`, h.alert.res.block.line);
});

const tamperAlert = template((t) => {
  const hits = alertsOn(t, TAMPER_EVENTS);
  if (!hits.length) {
    const m = t.metrics.find((x) => TAMPER_EVENTS.some((e) => x.filter.includes(e)));
    if (m) return fail(`${m.res.address} matches logging changes, but no alert policy with notification channels watches it.`, m.res.block.line);
    return fail("No alert policy fires when a sink or log bucket is deleted or changed, or an exclusion is added.");
  }
  const covered = [...new Set(hits.flatMap((h) => h.covered))];
  const missing = ["DeleteSink", "UpdateSink"].filter((e) => !covered.includes(e));
  const where = hits[0].alert.res;
  if (missing.length) return warn(`${where.address} alerts on ${covered.join(", ")}, but not on ${missing.join(" or ")}.`, where.block.line);
  return pass(`${where.address} notifies on ${covered.join(", ")}.`, where.block.line);
});

const loggingCantBeDisabled = template((t) => {
  const org = activeSinks(t).find(hierarchical);
  if (org) {
    return pass(`Admin Activity audit logs can't be disabled, and ${org.res.address} is set at ${org.scope === "organization" ? "organisation" : org.scope} level, so project owners can't remove it.`, org.res.block.line);
  }
  return warn("Admin Activity audit logs can't be disabled, but project owners can delete project sinks and turn off flow or Data Access logs. Route logs with an organisation sink.", first(t.sinks)?.res.block.line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const gcp: ProviderRules<GcpLogStoreView, GcpLoggingView> = {
  id: "gcp",
  label: "Google Cloud",
  prefix: "google_",
  noun: { one: "log store", many: "log stores" },
  build: buildView,
  rules: {
    // CCC.Core (imported by CCC.Logging). CN01.AR03 has no Cloud Logging setting: live test only.
    "CCC.Core.CN02.AR01": encryptionAtRest,
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN05.AR04": notPublic,
    "CCC.Core.CN06.AR01": regionTrusted,
    "CCC.Core.CN06.AR02": childRegionsTrusted,
    "CCC.Core.CN09.AR02": loggingCantBeDisabled,
    "CCC.Core.CN09.AR03": tamperAlert,
    "CCC.Core.CN10.AR01": forwardingInPerimeter,
    "CCC.Core.CN11.AR03": customerManagedKey,

    // CCC.Logging (CN04.AR01 field masking is live test only)
    "CCC.Logging.CN01.AR01": auditAndFlowLogsCentralised,
    "CCC.Logging.CN01.AR02": computeForwardsLogs,
    "CCC.Logging.CN02.AR01": retentionMeetsPolicy,
    "CCC.Logging.CN02.AR02": expiredLogsRemoved,
    "CCC.Logging.CN03.AR01": logsImmutable,
    "CCC.Logging.CN05.AR01": notPublic,
    "CCC.Logging.CN05.AR02": notPublic,
    "CCC.Logging.CN06.AR01": queryAnomalyAlert,
    "CCC.Logging.CN07.AR01": tamperAlert,
  },
};
