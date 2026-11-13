/**
 * Static rules mapping Azure Monitor Terraform (Log Analytics workspaces, diagnostic settings,
 * the Activity Log, network flow logs, alerts and the storage accounts that archive logs) to
 * CCC assessment requirements for the CCC.Logging catalog and the CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see Azure Policy, RBAC or diagnostic settings
 * created elsewhere, or how the service behaves at runtime.
 *
 * The primary resources ("log stores") are Log Analytics workspaces and the storage
 * accounts that diagnostic settings, flow logs or workspace data export write into.
 * Subscription-level checks are template-wide. Requirements without a rule are
 * shown as "Live test only" in the UI.
 */

import type { HclValue } from "../../hcl/parser";
import { references, subBlocks, textOf, type TfModel, type TfResource } from "../../terraform/model";
import type { Evidence, LabsSettings } from "../../types";
import { azureLocation, fail, first, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

// ── View ──────────────────────────────────────────────────────────────────────

interface Located<T> {
  value: T;
  line: number;
}

export interface AzureLogStoreView {
  res: TfResource;
  kind: "workspace" | "storage";
  name?: string;
  location?: string;
  /** Addresses of the diagnostic settings, flow logs and export rules that write into this store. */
  sources: string[];
  /** Workspace: retention_in_days (absent = the 30-day default). */
  retentionDays?: Located<number | undefined>;
  /** Storage: smallest lifecycle delete-after age, in days. */
  deleteAfterDays?: Located<number>;
  /** Line that proves a customer-managed key (storage CMK, or the workspace's cluster CMK). */
  cmk?: number;
  immutability?: { locked: boolean; days?: number; line: number };
  /** Workspace: storage accounts its data export rules copy to. */
  exportsTo: { res: TfResource; line: number }[];
  locks: Located<string | undefined>[];
  httpsOnly?: Located<boolean | undefined>;
  allowNestedPublic?: Located<boolean | undefined>;
  publicContainers: Located<string>[];
}

interface DiagnosticSetting {
  res: TfResource;
  categories: Set<string>;
  groups: Set<string>;
  hasLogs: boolean;
}

export interface AzureLoggingView extends BaseView<AzureLogStoreView> {
  diagnostics: DiagnosticSetting[];
  activityLogExports: DiagnosticSetting[];
  flowLogs: TfResource[];
}

const COMPUTE = ["azurerm_linux_virtual_machine", "azurerm_windows_virtual_machine", "azurerm_virtual_machine", "azurerm_linux_function_app", "azurerm_windows_function_app"];

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

function readDiagnostic(model: TfModel, res: TfResource): DiagnosticSetting {
  const categories = new Set<string>();
  const groups = new Set<string>();
  for (const b of [...subBlocks(res.block, "enabled_log"), ...subBlocks(res.block, "log")]) {
    if (model.bool(b.attrs.enabled?.value) === false) continue;
    const c = model.str(b.attrs.category?.value);
    const g = model.str(b.attrs.category_group?.value);
    if (c) categories.add(c);
    if (g) groups.add(g);
  }
  return { res, categories, groups, hasLogs: categories.size + groups.size > 0 };
}

/** True when a diagnostic setting targets the subscription itself (the Activity Log). */
function targetsSubscription(model: TfModel, v: HclValue | undefined): boolean {
  const t = flatText(model, v);
  return (v?.t === "ref" && v.path.startsWith("data.azurerm_subscription")) || /azurerm_subscription/.test(t) || (/\/subscriptions\//i.test(t) && !/providers\//i.test(t));
}

/** "global" is used by alert rules and action groups, which hold no log data. */
const regionOf = (model: TfModel, r: TfResource) => {
  if (!r.block.attrs.location) return null;
  const loc = azureLocation(model, r.block.attrs.location.value);
  return loc?.toLowerCase() === "global" ? null : loc;
};

function buildView(model: TfModel, settings: LabsSettings): AzureLoggingView {
  const diagnostics = model.ofType("azurerm_monitor_diagnostic_setting").map((d) => readDiagnostic(model, d));
  const flowLogs = model.ofType("azurerm_network_watcher_flow_log");
  const exportRules = model.ofType("azurerm_log_analytics_data_export_rule");
  const locks = model.ofType("azurerm_management_lock");

  const base = (res: TfResource, kind: AzureLogStoreView["kind"]): AzureLogStoreView => ({
    res,
    kind,
    name: model.str(res.block.attrs.name?.value),
    location: azureLocation(model, res.block.attrs.location?.value),
    sources: [],
    exportsTo: [],
    locks: locks.filter((l) => references(l.block.attrs.scope?.value, res.address)).map((l) => ({ value: model.str(l.block.attrs.lock_level?.value), line: l.block.line })),
    publicContainers: [],
  });

  const workspaces = model.ofType("azurerm_log_analytics_workspace").map((res): AzureLogStoreView => {
    const view = base(res, "workspace");
    const a = res.block.attrs;
    if (a.retention_in_days) view.retentionDays = { value: model.num(a.retention_in_days.value), line: a.retention_in_days.line };
    view.sources = [
      ...diagnostics.filter((d) => references(d.res.block.attrs.log_analytics_workspace_id?.value, res.address)).map((d) => d.res.address),
      ...flowLogs.filter((f) => subBlocks(f.block, "traffic_analytics").some((ta) => references(ta.attrs.workspace_resource_id?.value, res.address))).map((f) => f.address),
    ];
    // A workspace only gets a customer-managed key through a dedicated cluster it's linked to.
    for (const link of model.ofType("azurerm_log_analytics_linked_service")) {
      if (!references(link.block.attrs.workspace_id?.value, res.address)) continue;
      const cluster = model.ofType("azurerm_log_analytics_cluster").find((c) => references(link.block.attrs.write_access_id?.value, c.address));
      const key = cluster && model.ofType("azurerm_log_analytics_cluster_customer_managed_key").find((k) => references(k.block.attrs.log_analytics_cluster_id?.value, cluster.address));
      if (key) view.cmk = key.block.line;
    }
    return view;
  });

  const storage: AzureLogStoreView[] = [];
  for (const res of model.ofType("azurerm_storage_account")) {
    const b = res.block;
    const feeding = [
      ...diagnostics.filter((d) => references(d.res.block.attrs.storage_account_id?.value, res.address)).map((d) => d.res),
      ...flowLogs.filter((f) => references(f.block.attrs.storage_account_id?.value, res.address)),
      ...exportRules.filter((e) => references(e.block.attrs.destination_resource_id?.value, res.address)),
    ];
    // Only accounts that receive logs are log stores; the rest belong to the object-storage service.
    if (!feeding.length) continue;
    const view = base(res, "storage");
    view.sources = feeding.map((r) => r.address);
    const attr = <T>(keys: string[], read: (v: HclValue | undefined) => T): Located<T> | undefined => {
      const k = keys.find((x) => b.attrs[x]);
      return k ? { value: read(b.attrs[k].value), line: b.attrs[k].line } : undefined;
    };
    view.httpsOnly = attr(["https_traffic_only_enabled", "enable_https_traffic_only"], (v) => model.bool(v));
    view.allowNestedPublic = attr(["allow_nested_items_to_be_public", "allow_blob_public_access"], (v) => model.bool(v));

    const inlineCmk = first(subBlocks(b, "customer_managed_key"));
    const cmkRes = model.ofType("azurerm_storage_account_customer_managed_key").find((k) => references(k.block.attrs.storage_account_id?.value, res.address));
    view.cmk = inlineCmk?.line ?? cmkRes?.block.line;

    const imm = first(subBlocks(b, "immutability_policy"));
    const state = imm && model.str(imm.attrs.state?.value);
    if (imm && state !== "Disabled") view.immutability = { locked: state === "Locked", days: model.num(imm.attrs.period_since_creation_in_days?.value), line: imm.line };

    const containers = model.ofType("azurerm_storage_container").filter((c) => references(c.block.attrs.storage_account_id?.value, res.address) || references(c.block.attrs.storage_account_name?.value, res.address));
    for (const c of containers) {
      const access = model.str(c.block.attrs.container_access_type?.value) ?? "private";
      if (access !== "private") view.publicContainers.push({ value: `${c.address} (${access})`, line: c.block.attrs.container_access_type!.line });
      for (const p of model.ofType("azurerm_storage_container_immutability_policy")) {
        if (!references(p.block.attrs.storage_container_resource_manager_id?.value, c.address)) continue;
        if (!view.immutability?.locked) view.immutability = { locked: model.bool(p.block.attrs.locked?.value) === true, days: model.num(p.block.attrs.immutability_period_in_days?.value), line: p.block.line };
      }
    }

    for (const mp of model.ofType("azurerm_storage_management_policy").filter((m) => references(m.block.attrs.storage_account_id?.value, res.address))) {
      for (const rule of subBlocks(mp.block, "rule")) {
        if (model.bool(rule.attrs.enabled?.value) === false) continue;
        for (const actions of subBlocks(rule, "actions")) {
          for (const bb of subBlocks(actions, "base_blob")) {
            for (const k of ["delete_after_days_since_creation_greater_than", "delete_after_days_since_modification_greater_than"]) {
              const d = model.num(bb.attrs[k]?.value);
              if (d !== undefined && (!view.deleteAfterDays || d < view.deleteAfterDays.value)) view.deleteAfterDays = { value: d, line: bb.attrs[k].line };
            }
          }
        }
      }
    }
    storage.push(view);
  }

  for (const w of workspaces) {
    for (const e of exportRules) {
      if (model.bool(e.block.attrs.enabled?.value) === false || !references(e.block.attrs.workspace_resource_id?.value, w.res.address)) continue;
      const dest = storage.find((s) => references(e.block.attrs.destination_resource_id?.value, s.res.address));
      if (dest) w.exportsTo.push({ res: dest.res, line: e.block.line });
    }
  }

  const activityLogExports = diagnostics.filter(
    (d) => targetsSubscription(model, d.res.block.attrs.target_resource_id?.value) && (d.categories.has("Administrative") || d.groups.has("allLogs") || d.groups.has("audit")),
  );

  return { model, settings, buckets: [...workspaces, ...storage], diagnostics, activityLogExports, flowLogs };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<AzureLogStoreView, AzureLoggingView>();

const SEVERITY: Record<Evidence["status"], number> = { na: 0, pass: 1, manual: 2, warn: 3, fail: 4 };
const worstOf = (evs: Evidence[]): Evidence => evs.reduce((a, e) => (SEVERITY[e.status] > SEVERITY[a.status] ? e : a));
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
const WORKSPACE_DEFAULT_RETENTION = 30;

const workspaceRetention = (s: AzureLogStoreView) => (s.retentionDays ? s.retentionDays.value : WORKSPACE_DEFAULT_RETENTION);

// ── Rules: collection ─────────────────────────────────────────────────────────

const auditAndFlowLogsCentralised = template((t) => {
  const act = t.activityLogExports[0];
  const flow = t.flowLogs.find((f) => t.model.bool(f.block.attrs.enabled?.value) !== false);
  if (!act) {
    return fail(
      `No diagnostic setting exports the subscription's Activity Log (Administrative category), so audit events stay in the 90-day Activity Log${flow ? "" : " and there are no network flow logs"}.`,
      flow?.block.line,
    );
  }
  if (!flow) {
    return t.flowLogs.length
      ? fail(`${t.flowLogs[0].address} is declared with enabled = false, so network flows aren't recorded.`, t.flowLogs[0].block.attrs.enabled?.line)
      : fail(`${act.res.address} exports the Activity Log, but there's no azurerm_network_watcher_flow_log, so network flows aren't captured.`, act.res.block.line);
  }
  if (!subBlocks(flow.block, "traffic_analytics").length) {
    return warn(`${act.res.address} exports the Activity Log and ${flow.address} records flows, but only to a storage account: add traffic_analytics so flows reach the central workspace.`, flow.block.line);
  }
  return pass(`${act.res.address} exports the Activity Log and ${flow.address} records network flows, both to central log stores.`, act.res.block.line);
});

const computeForwardsLogs = template((t) => {
  const compute = t.model.resources.filter((r) => r.mode === "resource" && COMPUTE.includes(r.type));
  if (!compute.length) return na("No compute resources (virtual machines, function apps) in this template.");
  const dcrs = t.model.ofType("azurerm_monitor_data_collection_rule_association");
  const evs = compute.map((r): Evidence => {
    const diag = t.diagnostics.filter((d) => references(d.res.block.attrs.target_resource_id?.value, r.address));
    const withLogs = diag.find((d) => d.hasLogs);
    if (withLogs) return pass(`${withLogs.res.address} forwards ${r.address}'s logs.`, withLogs.res.block.line);
    const dcr = dcrs.find((d) => references(d.block.attrs.target_resource_id?.value, r.address));
    if (dcr) return pass(`${dcr.address} attaches a data collection rule, so the Azure Monitor Agent forwards ${r.address}'s OS logs.`, dcr.block.line);
    const appInsights =
      subBlocks(r.block, "site_config").some((s) => s.attrs.application_insights_connection_string || s.attrs.application_insights_key) ||
      /APPLICATIONINSIGHTS_CONNECTION_STRING/.test(flatText(t.model, r.block.attrs.app_settings?.value));
    if (appInsights) return pass(`${r.address} sends its logs to Application Insights.`, r.block.line);
    if (diag.length) return fail(`${diag[0].res.address} only sends metrics for ${r.address}; no logs are forwarded.`, diag[0].res.block.line);
    return fail(`Nothing forwards ${r.address}'s logs (no diagnostic setting or data collection rule).`, r.block.line);
  });
  return worstOf(evs);
});

const adminActionsLogged = template((t) => {
  const d = t.activityLogExports[0];
  if (d) return pass(`${d.res.address} exports the Activity Log, which records every change to workspaces, diagnostic settings and flow logs.`, d.res.block.line);
  return fail("The Activity Log only keeps management events for 90 days, and no diagnostic setting exports it from the subscription.");
});

// ── Rules: retention ──────────────────────────────────────────────────────────

const retentionMeetsPolicy = bucket((s, t) => {
  const min = t.settings.minLogRetentionDays;
  if (s.kind === "workspace") {
    const d = workspaceRetention(s);
    const line = s.retentionDays?.line ?? s.res.block.line;
    if (d === undefined) return warn("retention_in_days is computed, so the retention period can't be checked.", line);
    if (d < min) return fail(`Logs are kept for ${days(d)}${s.retentionDays ? "" : " (the default)"}, below the ${min}-day retention policy.`, line);
    return pass(`Logs are kept for ${days(d)} (policy: at least ${days(min)}).`, line);
  }
  const del = s.deleteAfterDays;
  if (del && del.value < min) return fail(`A lifecycle rule deletes log blobs after ${days(del.value)}, below the ${min}-day retention policy.`, del.line);
  if (s.immutability?.days !== undefined && s.immutability.days >= min) return pass(`An immutability policy retains every log blob for ${days(s.immutability.days)} (policy: at least ${days(min)}).`, s.immutability.line);
  if (del) return pass(`A lifecycle rule keeps log blobs for ${days(del.value)} before deleting them (policy: at least ${days(min)}).`, del.line);
  return warn("No lifecycle delete rule or immutability period, so retention isn't enforced: log blobs stay until someone deletes them.", s.res.block.line);
});

const expiredLogsRemoved = bucket((s, t) => {
  const min = t.settings.minLogRetentionDays;
  const d = s.kind === "workspace" ? workspaceRetention(s) : s.deleteAfterDays?.value;
  const line = (s.kind === "workspace" ? s.retentionDays?.line : s.deleteAfterDays?.line) ?? s.res.block.line;
  if (s.kind === "storage" && d === undefined) return fail(`No lifecycle delete rule, so log blobs older than ${days(min)} are never removed.`, line);
  if (d === undefined) return warn("The retention period is computed, so it can't be checked.", line);
  if (d > min) return warn(`Logs are kept for ${days(d)}, so queries for events between ${days(min)} and ${days(d)} old still return results.`, line);
  return pass(`Logs are deleted after ${days(d)}, so nothing older than the retention period can be queried.`, line);
});

// ── Rules: immutability ───────────────────────────────────────────────────────

const logsImmutable = bucket((s, t) => {
  if (s.kind === "workspace") {
    const locked = s.exportsTo.find((e) => t.buckets.find((b) => b.res === e.res)?.immutability?.locked);
    if (locked) return pass(`Log Analytics has no WORM option, but ${s.res.address} continuously exports to ${locked.res.address}, which has a locked immutability policy.`, locked.line);
    return fail("Log Analytics has no WORM option: data can be purged and the workspace deleted. Export it to storage with a locked immutability policy.", s.res.block.line);
  }
  const i = s.immutability;
  if (!i) return fail("No immutability policy, so log blobs can be modified or deleted.", s.res.block.line);
  if (i.locked) return pass(`A locked immutability policy keeps log blobs unmodifiable for ${i.days !== undefined ? days(i.days) : "its retention period"}; it can't be shortened or removed.`, i.line);
  return warn("The immutability policy is unlocked, so an administrator can still shorten or remove it.", i.line);
});

// ── Rules: access ─────────────────────────────────────────────────────────────

const notPublic = bucket((s) => {
  if (s.kind === "workspace") return pass("Log Analytics never allows anonymous access: every query needs Entra ID authentication.", s.res.block.line);
  const open = s.publicContainers[0];
  if (open) return fail(`${open.value} allows anonymous reads of log blobs.`, open.line);
  const p = s.allowNestedPublic;
  if (p?.value === false) return pass("allow_nested_items_to_be_public is false, so no log container can be made public.", p.line);
  if (p?.value === true) return fail("allow_nested_items_to_be_public is true, so containers can opt into anonymous access.", p.line);
  return fail("allow_nested_items_to_be_public isn't set to false. The azurerm provider defaults it to true.", s.res.block.line);
});

const denyInsecureTransport = bucket((s) => {
  if (s.kind === "workspace") return pass("Log Analytics only exposes HTTPS endpoints.", s.res.block.line);
  const h = s.httpsOnly;
  if (h?.value === true) return pass("Secure transfer required: HTTPS-only traffic is enabled.", h.line);
  if (h?.value === false) return fail("HTTPS-only traffic is disabled, so the log archive accepts plain HTTP.", h.line);
  return warn("https_traffic_only_enabled isn't set. It defaults to true, but pin it so drift is detectable.", s.res.block.line);
});

// ── Rules: encryption ─────────────────────────────────────────────────────────

const encryptionAtRest = bucket((s) => {
  if (s.cmk !== undefined) return pass("Logs are encrypted at rest with a customer-managed key.", s.cmk);
  const what = s.kind === "workspace" ? "Log Analytics" : "Azure Storage";
  return pass(`${what} always encrypts data at rest (with Microsoft-managed keys unless a customer-managed key is set).`, s.res.block.line);
});

const customerManagedKey = bucket((s) => {
  if (s.cmk !== undefined) {
    return pass(s.kind === "workspace" ? "The workspace is linked to a dedicated cluster encrypted with a customer-managed key." : "The storage account encrypts log blobs with a customer-managed key.", s.cmk);
  }
  return fail(
    s.kind === "workspace"
      ? "Microsoft-managed keys only. A workspace gets a customer-managed key by linking it to a dedicated cluster (azurerm_log_analytics_cluster_customer_managed_key)."
      : "No customer_managed_key, so log blobs use Microsoft-managed keys.",
    s.res.block.line,
  );
});

// ── Rules: location ───────────────────────────────────────────────────────────

const regionTrusted = bucket((s, t) => {
  const line = s.res.block.attrs.location?.line ?? s.res.block.line;
  if (!s.location) return warn("The location is unknown or computed at apply time.", line);
  if (isTrusted(s.location, t.settings)) return pass(`Stored in ${s.location}, which is in the trusted list.`, line);
  return fail(`Stored in ${s.location}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "azurerm_", "Azure", (r) => regionOf(t.model, r)));

const forwardingInPerimeter = template((t) => {
  const routes: { from: string; value: HclValue | undefined; line: number }[] = [
    ...t.model.ofType("azurerm_log_analytics_data_export_rule").map((e) => ({ from: e.address, value: e.block.attrs.destination_resource_id?.value, line: e.block.line })),
    ...t.diagnostics.flatMap((d) =>
      ["log_analytics_workspace_id", "storage_account_id", "eventhub_authorization_rule_id"]
        .filter((k) => d.res.block.attrs[k])
        .map((k) => ({ from: d.res.address, value: d.res.block.attrs[k].value, line: d.res.block.attrs[k].line })),
    ),
  ];
  if (!routes.length) return na("Logs aren't exported or forwarded to another destination.");
  for (const r of routes) {
    const target = t.model.resources.find((x) => x.mode === "resource" && references(r.value, x.address));
    if (!target) return warn(`${r.from} sends logs to a destination outside this template, so its location can't be checked.`, r.line);
    const loc = regionOf(t.model, target);
    if (!loc || !isTrusted(loc, t.settings)) return fail(`${r.from} sends logs to ${target.address} in ${loc ?? "an unknown location"}, outside the trusted list.`, r.line);
  }
  return pass("Every log export and diagnostic destination is in a trusted location.", routes[0].line);
});

// ── Rules: alerting and tamper resistance ─────────────────────────────────────

const TAMPER_OPS = [
  "Microsoft.Insights/diagnosticSettings/delete",
  "Microsoft.Insights/diagnosticSettings/write",
  "Microsoft.OperationalInsights/workspaces/delete",
  "Microsoft.Network/networkWatchers/flowLogs/delete",
];

const hasAction = (r: TfResource) => subBlocks(r.block, "action").length > 0;

const queryAnomalyAlert = template((t) => {
  const rules = t.model.ofType("azurerm_monitor_scheduled_query_rules_alert_v2").filter((r) => subBlocks(r.block, "criteria").some((c) => /LAQueryLogs/.test(flatText(t.model, c.attrs.query?.value))));
  if (!rules.length) return fail("No scheduled query alert over LAQueryLogs, so a principal running an unusual number of log queries isn't alerted on.");
  const rule = rules.find(hasAction);
  if (!rule) return fail(`${rules[0].address} queries LAQueryLogs but has no action group, so nobody is notified.`, rules[0].block.line);
  const audited = t.diagnostics.some((d) => t.buckets.some((w) => w.kind === "workspace" && references(d.res.block.attrs.target_resource_id?.value, w.res.address)) && (d.categories.has("Audit") || d.groups.has("audit") || d.groups.has("allLogs")));
  if (!audited) return warn(`${rule.address} alerts on LAQueryLogs, but no diagnostic setting enables the workspace's Audit category, so that table stays empty.`, rule.block.line);
  return pass(`${rule.address} alerts when log query volume per principal crosses its threshold (LAQueryLogs).`, rule.block.line);
});

const tamperAlert = template((t) => {
  const alerts = t.model.ofType("azurerm_monitor_activity_log_alert").map((r) => ({
    res: r,
    ops: subBlocks(r.block, "criteria").map((c) => t.model.str(c.attrs.operation_name?.value) ?? ""),
  }));
  const queries = t.model
    .ofType("azurerm_monitor_scheduled_query_rules_alert_v2")
    .map((r) => ({ res: r, ops: TAMPER_OPS.filter((op) => subBlocks(r.block, "criteria").some((c) => flatText(t.model, c.attrs.query?.value).toLowerCase().includes(op.toLowerCase()))) }));
  const matching = [...alerts, ...queries].map((a) => ({ ...a, ops: a.ops.filter((o) => TAMPER_OPS.some((x) => x.toLowerCase() === o.toLowerCase())) })).filter((a) => a.ops.length);
  if (!matching.length) return fail("No activity log alert fires when a diagnostic setting, workspace or flow log is deleted.");
  const acting = matching.filter((a) => hasAction(a.res));
  if (!acting.length) return warn(`${matching[0].res.address} matches logging changes but has no action group, so nobody is notified.`, matching[0].res.block.line);
  const covered = [...new Set(acting.flatMap((a) => a.ops))];
  if (!covered.some((o) => /diagnosticSettings\/delete/i.test(o))) {
    return warn(`${acting[0].res.address} alerts on ${covered.join(", ")}, but not when a diagnostic setting is deleted.`, acting[0].res.block.line);
  }
  return pass(`Activity log alerts notify an action group on ${covered.join(", ")}.`, acting[0].res.block.line);
});

const loggingCantBeDisabled = template((t) => {
  const locked = t.buckets.find((s) => s.kind === "workspace" && s.locks.some((l) => l.value === "CanNotDelete" || l.value === "ReadOnly"));
  if (locked) {
    return warn(
      `A management lock stops ${locked.res.address} being deleted, but a subscription Owner can still remove diagnostic settings without touching the resources they record; rely on the CCC.Logging.CN07 alert too.`,
      locked.locks[0].line,
    );
  }
  return fail("Anyone with Monitoring Contributor rights can delete the workspace or a diagnostic setting without affecting the resources it records. Add a CanNotDelete lock and alert on deletions.");
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const azure: ProviderRules<AzureLogStoreView, AzureLoggingView> = {
  id: "azure",
  label: "Azure",
  prefix: "azurerm_",
  noun: { one: "log store", many: "log stores" },
  build: buildView,
  rules: {
    // CCC.Core (imported by CCC.Logging)
    "CCC.Core.CN01.AR03": denyInsecureTransport,
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
