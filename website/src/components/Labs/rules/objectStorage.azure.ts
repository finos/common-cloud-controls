/**
 * Static rules mapping Azure Blob Storage Terraform (azurerm provider) to CCC
 * assessment requirements for CCC.ObjStor and the CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * The storage account is treated as the "bucket": most of the settings the CCC
 * controls care about live on the account, with containers inside it. Rules
 * only see what the template declares; Azure Policy, RBAC assignments and
 * resources created elsewhere are invisible. The authoritative checks are the
 * behavioural tests in modules/features.
 */

import type { HclValue } from "../hcl/parser";
import { references, subBlocks, textOf, type TfModel, type TfResource } from "../terraform/model";
import type { LabsSettings } from "../types";
import { fail, first, formatSeconds, isApprovedClass, isTrusted, locationsTrusted, na, normaliseRegion, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "./common";

interface Located<T> {
  value: T;
  line: number;
}

interface DiagnosticSetting {
  res: TfResource;
  /** True when the setting targets the blobServices/default child resource. */
  blob: boolean;
  categories: Set<string>;
  groups: Set<string>;
  /** The storage account the logs are written to, when they go to a storage account. */
  storageDestination?: HclValue;
  destination?: string;
}

interface ContainerView {
  res: TfResource;
  access?: string;
  line: number;
  /** default_encryption_scope is set and callers can't override it. */
  scopePinned: boolean;
}

interface ImmutabilityView {
  locked: boolean;
  days?: number;
  line: number;
  /** "account" for account-level policies, else the container address. */
  scope: string;
}

export interface AccountView {
  res: TfResource;
  name?: string;
  location?: string;
  minTls?: Located<string | undefined>;
  httpsOnly?: Located<boolean | undefined>;
  cmk?: number;
  allowNestedPublic?: Located<boolean | undefined>;
  sharedKey?: Located<boolean | undefined>;
  hns?: Located<boolean | undefined>;
  versioning?: Located<boolean | undefined>;
  containerSoftDeleteDays?: Located<number | undefined>;
  replicationType?: Located<string | undefined>;
  sasPolicy?: { period?: string; action?: string; line: number };
  containers: ContainerView[];
  locks: Located<string | undefined>[];
  immutability: ImmutabilityView[];
  diagnostics: DiagnosticSetting[];
  tiers: Located<string>[];
  objectReplicationDests: Located<HclValue | undefined>[];
}

export interface AzureView extends BaseView<AccountView> {
  activityLogExports: TfResource[];
}

const ACCOUNT = "azurerm_storage_account";

/** Microsoft's documented region pairs (the secondary used by GRS/GZRS). Directed: key replicates to value. */
const REGION_PAIRS: Record<string, string> = {
  eastus: "westus",
  westus: "eastus",
  eastus2: "centralus",
  centralus: "eastus2",
  northcentralus: "southcentralus",
  southcentralus: "northcentralus",
  westus2: "westcentralus",
  westcentralus: "westus2",
  westus3: "eastus",
  uksouth: "ukwest",
  ukwest: "uksouth",
  northeurope: "westeurope",
  westeurope: "northeurope",
  francecentral: "francesouth",
  germanywestcentral: "germanynorth",
  switzerlandnorth: "switzerlandwest",
  norwayeast: "norwaywest",
  swedencentral: "swedensouth",
  eastasia: "southeastasia",
  southeastasia: "eastasia",
  australiaeast: "australiasoutheast",
  australiasoutheast: "australiaeast",
  japaneast: "japanwest",
  japanwest: "japaneast",
  koreacentral: "koreasouth",
  canadacentral: "canadaeast",
  canadaeast: "canadacentral",
  centralindia: "southindia",
  brazilsouth: "southcentralus",
  southafricanorth: "southafricawest",
  uaenorth: "uaecentral",
};

const GEO_REDUNDANT = ["GRS", "RAGRS", "GZRS", "RAGZRS"];

function rawText(v: HclValue | undefined): string {
  if (!v) return "";
  return v.t === "str" ? v.v : textOf(v);
}

/** Resolves a location, following `azurerm_resource_group.x.location`-style references within the template. */
function locationOf(model: TfModel, v: HclValue | undefined, depth = 0): string | undefined {
  const r = model.resolve(v);
  if (r?.t === "ref") {
    const m = /^(data\.)?(\w+)\.([\w-]+)\.location$/.exec(r.path);
    const res = m && depth < 5 ? model.find(m[1] ? "data" : "resource", m[2], m[3]) : undefined;
    return res ? locationOf(model, res.block.attrs.location?.value, depth + 1) : undefined;
  }
  return model.str(r);
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

export function buildAzureView(model: TfModel, settings: LabsSettings): AzureView {
  const diagnostics = model.ofType("azurerm_monitor_diagnostic_setting");

  const buckets = model.ofType(ACCOUNT).map((res): AccountView => {
    const b = res.block;
    const name = model.str(b.attrs.name?.value);
    const pointsHere = (v: HclValue | undefined) => references(v, res.address) || (name !== undefined && model.str(v) === name);
    const linked = (type: string, ...attrs: string[]) => model.ofType(type).filter((r) => attrs.some((a) => pointsHere(r.block.attrs[a]?.value)));
    const attr = <T>(key: string | string[], read: (v: HclValue | undefined) => T): Located<T> | undefined => {
      for (const k of ([] as string[]).concat(key)) {
        const a = b.attrs[k];
        if (a) return { value: read(a.value), line: a.line };
      }
      return undefined;
    };

    const blobProps = first(subBlocks(b, "blob_properties"));
    const containerDelete = blobProps && first(subBlocks(blobProps, "container_delete_retention_policy"));
    const sas = first(subBlocks(b, "sas_policy"));

    const view: AccountView = {
      res,
      name,
      location: locationOf(model, b.attrs.location?.value),
      minTls: attr("min_tls_version", (v) => model.str(v)),
      httpsOnly: attr(["https_traffic_only_enabled", "enable_https_traffic_only"], (v) => model.bool(v)),
      allowNestedPublic: attr(["allow_nested_items_to_be_public", "allow_blob_public_access"], (v) => model.bool(v)),
      sharedKey: attr("shared_access_key_enabled", (v) => model.bool(v)),
      hns: attr("is_hns_enabled", (v) => model.bool(v)),
      replicationType: attr("account_replication_type", (v) => model.str(v)?.toUpperCase()),
      versioning: blobProps?.attrs.versioning_enabled
        ? { value: model.bool(blobProps.attrs.versioning_enabled.value), line: blobProps.attrs.versioning_enabled.line }
        : undefined,
      containerSoftDeleteDays: containerDelete ? { value: model.num(containerDelete.attrs.days?.value) ?? 7, line: containerDelete.line } : undefined,
      sasPolicy: sas ? { period: model.str(sas.attrs.expiration_period?.value), action: model.str(sas.attrs.expiration_action?.value), line: sas.line } : undefined,
      containers: [],
      locks: [],
      immutability: [],
      diagnostics: [],
      tiers: [],
      objectReplicationDests: [],
    };

    const inlineCmk = first(subBlocks(b, "customer_managed_key"));
    const cmkRes = first(linked("azurerm_storage_account_customer_managed_key", "storage_account_id"));
    view.cmk = inlineCmk?.line ?? cmkRes?.block.line;

    view.containers = linked("azurerm_storage_container", "storage_account_id", "storage_account_name").map((c) => ({
      res: c,
      access: model.str(c.block.attrs.container_access_type?.value) ?? "private",
      line: c.block.attrs.container_access_type?.line ?? c.block.line,
      scopePinned: !!c.block.attrs.default_encryption_scope && model.bool(c.block.attrs.encryption_scope_override_enabled?.value) === false,
    }));

    view.locks = linked("azurerm_management_lock", "scope").map((l) => ({ value: model.str(l.block.attrs.lock_level?.value), line: l.block.line }));

    const accImm = first(subBlocks(b, "immutability_policy"));
    if (accImm) {
      const state = model.str(accImm.attrs.state?.value);
      if (state !== "Disabled") {
        view.immutability.push({ locked: state === "Locked", days: model.num(accImm.attrs.period_since_creation_in_days?.value), line: accImm.line, scope: "account" });
      }
    }
    for (const c of view.containers) {
      for (const p of model.ofType("azurerm_storage_container_immutability_policy")) {
        if (!references(p.block.attrs.storage_container_resource_manager_id?.value, c.res.address)) continue;
        view.immutability.push({
          locked: model.bool(p.block.attrs.locked?.value) === true,
          days: model.num(p.block.attrs.immutability_period_in_days?.value),
          line: p.block.line,
          scope: c.res.address,
        });
      }
    }

    for (const d of diagnostics) {
      const target = d.block.attrs.target_resource_id?.value;
      if (!pointsHere(target)) continue;
      const { categories, groups } = categoriesOf(model, d);
      const storageDestination = d.block.attrs.storage_account_id?.value;
      view.diagnostics.push({
        res: d,
        blob: /blobServices/i.test(rawText(target)),
        categories,
        groups,
        storageDestination,
        destination: d.block.attrs.log_analytics_workspace_id
          ? "a Log Analytics workspace"
          : d.block.attrs.eventhub_authorization_rule_id
            ? "Event Hubs"
            : storageDestination
              ? "a storage account"
              : undefined,
      });
    }

    const accessTier = model.str(b.attrs.access_tier?.value);
    if (accessTier && accessTier.toLowerCase() !== "hot" && accessTier.toLowerCase() !== "premium") {
      view.tiers.push({ value: accessTier.toUpperCase(), line: b.attrs.access_tier!.line });
    }
    for (const mp of linked("azurerm_storage_management_policy", "storage_account_id")) {
      for (const rule of subBlocks(mp.block, "rule")) {
        for (const actions of subBlocks(rule, "actions")) {
          for (const target of [...subBlocks(actions, "base_blob"), ...subBlocks(actions, "snapshot"), ...subBlocks(actions, "version")]) {
            for (const [k, a] of Object.entries(target.attrs)) {
              const m = /^(?:tier_to_|change_tier_to_)(cool|cold|archive)/.exec(k);
              if (m) view.tiers.push({ value: m[1].toUpperCase(), line: a.line });
            }
          }
        }
      }
    }

    for (const r of linked("azurerm_storage_object_replication", "source_storage_account_id")) {
      view.objectReplicationDests.push({ value: r.block.attrs.destination_storage_account_id?.value, line: r.block.line });
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

  return { model, buckets, settings, activityLogExports };
}

const { bucket, template } = ruleFactories<AccountView, AzureView>();

// Encryption in transit -------------------------------------------------------

const minimumTls13 = bucket((a) => {
  const v = a.minTls?.value;
  if (v === "TLS1_3") return pass("min_tls_version is TLS1_3.", a.minTls!.line);
  if (v === "TLS1_0" || v === "TLS1_1") return fail(`min_tls_version is ${v}, which allows deprecated TLS versions.`, a.minTls!.line);
  if (v === "TLS1_2") return warn("The minimum TLS version is 1.2, but the requirement asks for 1.3. Set TLS1_3 if your provider version and region support it.", a.minTls!.line);
  return warn("min_tls_version isn't set. The azurerm provider defaults to TLS1_2, below the TLS 1.3 the requirement asks for.", a.res.block.line);
});

const denyInsecureTransport = bucket((a) => {
  const h = a.httpsOnly;
  if (h?.value === true) return pass("Secure transfer required: HTTPS-only traffic is enabled.", h.line);
  if (h?.value === false) return fail("HTTPS-only traffic is disabled, so the account accepts plain HTTP.", h.line);
  return warn("https_traffic_only_enabled isn't set. It defaults to true, but pin it so drift is detectable.", a.res.block.line);
});

// Encryption at rest ----------------------------------------------------------

const encryptionAtRest = bucket((a) => {
  if (a.cmk) return pass("Data is encrypted at rest with a customer-managed key.", a.cmk);
  return pass("Azure Storage always encrypts data at rest (with Microsoft-managed keys unless a customer-managed key is set); it can't be turned off.", a.res.block.line);
});

const restrictKeysOnWrite = bucket((a) => {
  if (!a.cmk) return fail("No customer-managed key, so writes aren't tied to a key your organisation trusts.", a.res.block.line);
  if (a.containers.length && a.containers.every((c) => c.scopePinned)) {
    return pass("A customer-managed key is the default, and every container pins its encryption scope so writers can't choose another key.", a.cmk);
  }
  return warn(
    "A customer-managed key is the account default, but writers can still pick another encryption scope. Pin default_encryption_scope with encryption_scope_override_enabled = false on each container to close this.",
    a.cmk,
  );
});

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template((t) => {
  const d = t.activityLogExports[0];
  if (d) return pass(`${d.address} exports the subscription Activity Log (management events) for long-term retention.`, d.block.line);
  return fail("The Activity Log only keeps management events for 90 days, and no diagnostic setting exports it (Administrative category) from the subscription.");
});

function dataEventsLogged(kind: "write" | "read") {
  const category = kind === "write" ? "StorageWrite" : "StorageRead";
  return bucket((a) => {
    const covers = (d: DiagnosticSetting) => d.categories.has(category) || d.groups.has("allLogs") || d.groups.has("audit");
    const good = a.diagnostics.find((d) => d.blob && covers(d));
    if (good) return pass(`${good.res.address} sends ${category} logs for the blob service to ${good.destination ?? "a destination"}.`, good.res.block.line);
    const root = a.diagnostics.find((d) => !d.blob);
    if (root) {
      return warn(`${root.res.address} targets the storage account itself. Blob ${kind} logs are only available on its blobServices/default child resource.`, root.res.block.line);
    }
    return fail(`No diagnostic setting sends ${category} logs for this account's blob service, so object ${kind}s aren't logged.`, a.res.block.line);
  });
}

const logsSeparatedFromResource = bucket((a) => {
  if (!a.diagnostics.length) return na("No diagnostic logs are configured for this account (see CCC.Core.CN04).");
  const self = a.diagnostics.find((d) => references(d.storageDestination, a.res.address));
  if (self) return fail("Diagnostic logs are written into the same storage account they record, so anyone with access to the account can reach its logs.", self.res.block.line);
  const d = a.diagnostics[0];
  return pass(`Diagnostic logs go to ${d.destination ?? "a separate destination"}.`, d.res.block.line);
});

// Access ----------------------------------------------------------------------

const noAnonymousAccess = bucket((a) => {
  const open = a.containers.find((c) => c.access === "blob" || c.access === "container");
  if (open) return fail(`${open.res.address} has container_access_type = "${open.access}", which allows anonymous reads.`, open.line);
  if (a.allowNestedPublic?.value === false) {
    return warn("Anonymous access is disallowed on the account. Whether named principals are authorised can only be confirmed with a live test.", a.allowNestedPublic.line);
  }
  return warn("No anonymous containers found in this template. Confirm with a live test: RBAC assignments elsewhere may still grant access.", a.res.block.line);
});

const uniformAccess = bucket((a) => {
  if (a.hns?.value) return fail("Hierarchical namespace is enabled, which allows POSIX ACLs on individual files and directories.", a.hns.line);
  if (a.sharedKey?.value === false) {
    return pass("No per-object ACLs, and shared keys are disabled, so access is only granted through Entra ID at container scope or above.", a.sharedKey.line);
  }
  return warn(
    "Blob Storage has no per-object ACLs, but shared keys are enabled, so service SAS tokens can grant access to individual blobs. Set shared_access_key_enabled = false.",
    a.sharedKey?.line ?? a.res.block.line,
  );
});

const publicAccessBlocked = bucket((a) => {
  const p = a.allowNestedPublic;
  if (p?.value === false) return pass("allow_nested_items_to_be_public is false, so no container can be made public.", p.line);
  if (p?.value === true) return fail("allow_nested_items_to_be_public is true, so containers can opt into anonymous access.", p.line);
  return fail("allow_nested_items_to_be_public isn't set to false. The azurerm provider defaults it to true.", a.res.block.line);
});

// Data protection -------------------------------------------------------------

const versioningEnabled = bucket((a) => {
  if (a.versioning?.value) return pass("Blob versioning is enabled.", a.versioning.line);
  return fail("Blob versioning isn't enabled (blob_properties.versioning_enabled), so overwritten or deleted blobs can't be recovered.", a.versioning?.line ?? a.res.block.line);
});

const deletionRecoverable = bucket((a) => {
  const lock = a.locks.find((l) => l.value === "CanNotDelete" || l.value === "ReadOnly");
  if (lock) return pass(`A ${lock.value} management lock stops the storage account being deleted.`, lock.line);
  const sd = a.containerSoftDeleteDays;
  if (sd?.value) return pass(`Deleted containers can be restored for ${sd.value} day(s) (container soft delete).`, sd.line);
  return fail("No management lock or container soft delete, so a deleted account or container can't be recovered.", a.res.block.line);
});

const retentionIrrevocable = bucket((a) => {
  const locked = a.immutability.find((i) => i.locked);
  if (locked) return pass("A locked immutability policy can't be shortened or removed.", locked.line);
  const unlocked = a.immutability[0];
  if (unlocked) return warn("The immutability policy is unlocked, so it can still be shortened or removed.", unlocked.line);
  return fail("No immutability policy, so there's no retention policy to protect.", a.res.block.line);
});

const defaultRetentionApplied = bucket((a) => {
  const p = a.immutability.find((i) => i.days);
  if (!p) return fail("No immutability policy with a retention period, so new blobs aren't protected from deletion or overwrite.", a.res.block.line);
  const where = p.scope === "account" ? "every blob in the account" : `blobs in ${p.scope}`;
  return pass(`An immutability policy protects ${where} for ${p.days} day(s) automatically.`, p.line);
});

const retentionEnforced = bucket((a) => {
  const locked = a.immutability.find((i) => i.locked);
  if (locked) return pass("A locked immutability policy blocks deletion and overwrite of protected blobs.", locked.line);
  const p = a.immutability[0];
  if (p) return warn("An unlocked immutability policy blocks deletes and overwrites, but can be shortened or removed.", p.line);
  return fail("No immutability policy, so deletes and overwrites aren't blocked.", a.res.block.line);
});

const mfaDelete = bucket((a) => {
  const locked = a.immutability.find((i) => i.locked);
  if (locked) {
    return warn(
      "Azure Blob Storage has no MFA-delete setting. A locked immutability policy blocks deletion during the retention period instead; requiring MFA needs Entra ID Conditional Access, which isn't visible here.",
      locked.line,
    );
  }
  return fail("Azure Blob Storage has no MFA-delete setting, and nothing in this template blocks deletion (consider a locked immutability policy).", a.res.block.line);
});

/** Parses an Azure "D.HH:MM:SS" duration into seconds. */
function parseAzureDuration(s: string | undefined): number | undefined {
  const m = s && /^(\d+)\.(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(s.trim());
  if (!m) return undefined;
  return Number(m[1]) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]);
}

const sasExpiry = bucket((a, t) => {
  const max = t.settings.maxPresignedUrlSeconds;
  const p = a.sasPolicy;
  if (!p) return fail(`No sas_policy, so SAS tokens can be issued with any expiry (threshold: ${formatSeconds(max)}).`, a.res.block.line);
  const secs = parseAzureDuration(p.period);
  if (secs === undefined) return warn(`sas_policy.expiration_period "${p.period ?? ""}" isn't in D.HH:MM:SS form.`, p.line);
  if (secs > max) return fail(`sas_policy allows SAS tokens up to ${formatSeconds(secs)}, above the ${formatSeconds(max)} threshold.`, p.line);
  if (p.action === "Block") return pass(`SAS tokens longer than ${formatSeconds(secs)} are blocked.`, p.line);
  return warn(`SAS tokens longer than ${formatSeconds(secs)} are only logged, not blocked. Set expiration_action = "Block".`, p.line);
});

const approvedStorageClasses = bucket((a, t) => {
  if (!a.tiers.length) return na("No tier changes are configured (no lifecycle management policy or non-hot access tier).");
  const bad = a.tiers.find((x) => !isApprovedClass(x.value, t.settings));
  if (bad) return fail(`Blobs move to the ${bad.value} tier, which isn't an approved tier.`, bad.line);
  return pass(`All tier changes target approved tiers (${[...new Set(a.tiers.map((x) => x.value))].join(", ")}).`, a.tiers[0].line);
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((a, t) => {
  const line = a.res.block.attrs.location?.line ?? a.res.block.line;
  if (!a.location) return warn("The location is unknown or computed at apply time.", line);
  if (isTrusted(a.location, t.settings)) return pass(`Deployed to ${a.location}, which is in the trusted list.`, line);
  return fail(`Deployed to ${a.location}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) =>
  locationsTrusted(t, "azurerm_", "Azure", (r) => (r.block.attrs.location ? locationOf(t.model, r.block.attrs.location.value) : null)),
);

const replicationInPerimeter = bucket((a, t) => {
  const checks: { region?: string; what: string; line: number }[] = [];
  const rt = a.replicationType;
  if (rt?.value && GEO_REDUNDANT.includes(rt.value)) {
    const pair = a.location ? REGION_PAIRS[normaliseRegion(a.location)] : undefined;
    if (!pair) return warn(`${rt.value} replicates to the paired region of ${a.location ?? "an unknown location"}, which this check doesn't know.`, rt.line);
    checks.push({ region: pair, what: `${rt.value} replication to the paired region`, line: rt.line });
  }
  for (const d of a.objectReplicationDests) {
    const target = t.buckets.find((x) => references(d.value, x.res.address));
    if (!target) return warn("The object replication destination isn't defined in this template, so its location can't be checked.", d.line);
    checks.push({ region: target.location, what: `Object replication to ${target.res.address}`, line: d.line });
  }
  if (!checks.length) return na(`No cross-region replication is configured${rt?.value ? ` (${rt.value} stays in one region)` : ""}.`);
  const bad = checks.find((c) => !c.region || !isTrusted(c.region, t.settings));
  if (bad) return fail(`${bad.what} goes to ${bad.region ?? "an unknown location"}, outside the trusted list.`, bad.line);
  return pass(`All replication targets (${checks.map((c) => c.region).join(", ")}) are trusted.`, checks[0].line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const azure: ProviderRules<AccountView, AzureView> = {
  id: "azure",
  label: "Azure",
  prefix: "azurerm_",
  build: buildAzureView,
  rules: {
    "CCC.Core.CN01.AR01": minimumTls13,
    "CCC.Core.CN01.AR03": denyInsecureTransport,
    "CCC.Core.CN02.AR01": encryptionAtRest,
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN04.AR02": dataEventsLogged("write"),
    "CCC.Core.CN04.AR03": dataEventsLogged("read"),
    "CCC.Core.CN05.AR01": noAnonymousAccess,
    "CCC.Core.CN05.AR04": noAnonymousAccess,
    "CCC.Core.CN05.AR06": noAnonymousAccess,
    "CCC.Core.CN06.AR01": regionTrusted,
    "CCC.Core.CN06.AR02": childRegionsTrusted,
    "CCC.Core.CN09.AR01": logsSeparatedFromResource,
    "CCC.Core.CN10.AR01": replicationInPerimeter,

    "CCC.ObjStor.CN01.AR03": restrictKeysOnWrite,
    "CCC.ObjStor.CN01.AR04": restrictKeysOnWrite,
    "CCC.ObjStor.CN02.AR01": uniformAccess,
    "CCC.ObjStor.CN02.AR02": uniformAccess,
    "CCC.ObjStor.CN03.AR01": deletionRecoverable,
    "CCC.ObjStor.CN03.AR02": retentionIrrevocable,
    "CCC.ObjStor.CN04.AR01": defaultRetentionApplied,
    "CCC.ObjStor.CN04.AR02": retentionEnforced,
    "CCC.ObjStor.CN05.AR01": versioningEnabled,
    "CCC.ObjStor.CN05.AR02": versioningEnabled,
    "CCC.ObjStor.CN05.AR03": versioningEnabled,
    "CCC.ObjStor.CN05.AR04": versioningEnabled,
    "CCC.ObjStor.CN07.AR01": mfaDelete,
    "CCC.ObjStor.CN07.AR02": mfaDelete,
    "CCC.ObjStor.CN08.AR01": sasExpiry,
    "CCC.ObjStor.CN09.AR01": publicAccessBlocked,
    "CCC.ObjStor.CN09.AR02": publicAccessBlocked,
    "CCC.ObjStor.CN10.AR01": approvedStorageClasses,
  },
};
