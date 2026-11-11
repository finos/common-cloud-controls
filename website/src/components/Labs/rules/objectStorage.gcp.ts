/**
 * Static rules mapping Google Cloud Storage Terraform (google provider) to CCC
 * assessment requirements for CCC.ObjStor and the CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * Rules only see what the template declares; organisation policies, IAM granted
 * at folder or organisation level, and resources created elsewhere are invisible.
 * The authoritative checks are the behavioural tests in modules/features.
 *
 * Requirements with no static equivalent on GCS (e.g. denying plain-HTTP
 * requests or capping signed-URL lifetime) are deliberately left unmapped so
 * they show as "Live test only".
 */

import type { HclBlock, HclValue } from "../hcl/parser";
import { references, subBlocks, type TfModel, type TfResource } from "../terraform/model";
import type { LabsSettings } from "../types";
import { fail, first, isApprovedClass, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "./common";

interface Located<T> {
  value: T;
  line: number;
}

export interface GcsBucketView {
  res: TfResource;
  name?: string;
  location?: Located<string | undefined>;
  uniform?: Located<boolean | undefined>;
  publicAccessPrevention?: Located<string | undefined>;
  versioning?: Located<boolean | undefined>;
  retention?: { seconds?: number; locked: boolean; line: number };
  softDeleteSeconds?: Located<number | undefined>;
  kmsKey?: number;
  logging?: { target?: HclValue; line: number };
  dataLocations: string[];
  classes: Located<string>[];
  publicMembers: Located<string>[];
  acls: Located<string>[];
}

interface OrgPolicy {
  constraint: string;
  enforced: boolean;
  denied: string[];
  line: number;
}

export interface GcpView extends BaseView<GcsBucketView> {
  auditConfigs: { types: Set<string>; line: number }[];
  orgPolicies: OrgPolicy[];
}

const PUBLIC_MEMBERS = ["allUsers", "allAuthenticatedUsers"];
const PUBLIC_PREDEFINED_ACLS = ["publicRead", "publicReadWrite", "authenticatedRead"];

function readOrgPolicies(model: TfModel): OrgPolicy[] {
  const out: OrgPolicy[] = [];
  // google_org_policy_policy (v2 API): name = ".../policies/storage.publicAccessPrevention"
  for (const p of model.ofType("google_org_policy_policy")) {
    const name = model.str(p.block.attrs.name?.value) ?? "";
    const constraint = name.split("/policies/").pop() ?? name;
    const rules = subBlocks(p.block, "spec").flatMap((s) => subBlocks(s, "rules"));
    out.push({
      constraint,
      enforced: rules.some((r) => (model.str(r.attrs.enforce?.value) ?? "").toUpperCase() === "TRUE"),
      denied: rules.flatMap((r) => subBlocks(r, "values").flatMap((v) => model.strList(v.attrs.denied_values?.value))),
      line: p.block.line,
    });
  }
  // google_{project,folder,organization}_organization_policy (v1 API)
  for (const type of ["google_project_organization_policy", "google_folder_organization_policy", "google_organization_policy"]) {
    for (const p of model.ofType(type)) {
      const constraint = (model.str(p.block.attrs.constraint?.value) ?? "").replace(/^constraints\//, "");
      const bool = first(subBlocks(p.block, "boolean_policy"));
      const list = first(subBlocks(p.block, "list_policy"));
      out.push({
        constraint,
        enforced: model.bool(bool?.attrs.enforced?.value) === true,
        denied: list ? subBlocks(list, "deny").flatMap((d) => model.strList(d.attrs.values?.value)) : [],
        line: p.block.line,
      });
    }
  }
  return out;
}

function membersFromPolicyData(model: TfModel, v: HclValue | undefined): string[] {
  const r = model.resolve(v);
  const m = r?.t === "ref" ? /^data\.google_iam_policy\.([\w-]+)\.policy_data$/.exec(r.path) : null;
  const doc = m && model.find("data", "google_iam_policy", m[1]);
  if (!doc) return [];
  return subBlocks(doc.block, "binding").flatMap((b: HclBlock) => model.strList(b.attrs.members?.value));
}

export function buildGcpView(model: TfModel, settings: LabsSettings): GcpView {
  const buckets = model.ofType("google_storage_bucket").map((res): GcsBucketView => {
    const b = res.block;
    const name = model.str(b.attrs.name?.value);
    const linked = (type: string) =>
      model.ofType(type).filter((r) => {
        const v = r.block.attrs.bucket?.value;
        return references(v, res.address) || (name !== undefined && model.str(v) === name);
      });
    const attr = <T>(key: string, read: (v: HclValue | undefined) => T): Located<T> | undefined =>
      b.attrs[key] ? { value: read(b.attrs[key].value), line: b.attrs[key].line } : undefined;

    const ver = first(subBlocks(b, "versioning"));
    const ret = first(subBlocks(b, "retention_policy"));
    const sd = first(subBlocks(b, "soft_delete_policy"));
    const enc = first(subBlocks(b, "encryption"));
    const log = first(subBlocks(b, "logging"));
    const placement = first(subBlocks(b, "custom_placement_config"));

    const view: GcsBucketView = {
      res,
      name,
      location: attr("location", (v) => model.str(v)),
      uniform: attr("uniform_bucket_level_access", (v) => model.bool(v)),
      publicAccessPrevention: attr("public_access_prevention", (v) => model.str(v)),
      versioning: ver ? { value: model.bool(ver.attrs.enabled?.value), line: ver.line } : undefined,
      retention: ret ? { seconds: model.num(ret.attrs.retention_period?.value), locked: model.bool(ret.attrs.is_locked?.value) === true, line: ret.line } : undefined,
      softDeleteSeconds: sd ? { value: model.num(sd.attrs.retention_duration_seconds?.value), line: sd.line } : undefined,
      kmsKey: enc?.attrs.default_kms_key_name ? enc.line : undefined,
      logging: log ? { target: log.attrs.log_bucket?.value, line: log.line } : undefined,
      dataLocations: placement ? model.strList(placement.attrs.data_locations?.value) : [],
      classes: [],
      publicMembers: [],
      acls: [],
    };

    const cls = model.str(b.attrs.storage_class?.value);
    if (cls && cls.toUpperCase() !== "STANDARD") view.classes.push({ value: cls.toUpperCase(), line: b.attrs.storage_class!.line });
    for (const rule of subBlocks(b, "lifecycle_rule")) {
      for (const action of subBlocks(rule, "action")) {
        if (model.str(action.attrs.type?.value) !== "SetStorageClass") continue;
        view.classes.push({ value: (model.str(action.attrs.storage_class?.value) ?? "a computed class").toUpperCase(), line: action.line });
      }
    }

    for (const m of linked("google_storage_bucket_iam_member")) {
      const member = model.str(m.block.attrs.member?.value);
      if (member && PUBLIC_MEMBERS.includes(member)) view.publicMembers.push({ value: member, line: m.block.line });
    }
    for (const m of linked("google_storage_bucket_iam_binding")) {
      const member = model.strList(m.block.attrs.members?.value).find((x) => PUBLIC_MEMBERS.includes(x));
      if (member) view.publicMembers.push({ value: member, line: m.block.line });
    }
    for (const m of linked("google_storage_bucket_iam_policy")) {
      const member = membersFromPolicyData(model, m.block.attrs.policy_data?.value).find((x) => PUBLIC_MEMBERS.includes(x));
      if (member) view.publicMembers.push({ value: member, line: m.block.line });
    }

    for (const type of ["google_storage_bucket_access_control", "google_storage_default_object_access_control", "google_storage_object_access_control"]) {
      for (const a of linked(type)) view.acls.push({ value: model.str(a.block.attrs.entity?.value) ?? "an entity", line: a.block.line });
    }
    for (const a of linked("google_storage_bucket_acl")) {
      const predefined = model.str(a.block.attrs.predefined_acl?.value);
      const entities = model.strList(a.block.attrs.role_entity?.value);
      view.acls.push({ value: predefined ?? (entities.join(", ") || "custom"), line: a.block.line });
    }

    return view;
  });

  const auditConfigs = ["google_project_iam_audit_config", "google_folder_iam_audit_config", "google_organization_iam_audit_config"]
    .flatMap((t) => model.ofType(t))
    .filter((r) => ["storage.googleapis.com", "allServices"].includes(model.str(r.block.attrs.service?.value) ?? ""))
    .map((r) => ({ types: new Set(subBlocks(r.block, "audit_log_config").map((c) => model.str(c.attrs.log_type?.value) ?? "")), line: r.block.line }));

  return { model, buckets, settings, auditConfigs, orgPolicies: readOrgPolicies(model) };
}

const { bucket, template } = ruleFactories<GcsBucketView, GcpView>();

const policy = (t: GcpView, constraint: string) => t.orgPolicies.find((p) => p.constraint === constraint);

// Encryption in transit -------------------------------------------------------

const minimumTls13 = template((t) => {
  const p = policy(t, "gcp.restrictTLSVersion");
  if (!p) return fail("No gcp.restrictTLSVersion organisation policy, so clients can connect with older TLS versions.");
  if (p.denied.includes("TLS_VERSION_1_2")) return pass("Organisation policy denies TLS 1.2 and below.", p.line);
  if (p.denied.includes("TLS_VERSION_1_1")) {
    return warn("Organisation policy denies TLS 1.0 and 1.1, but TLS 1.2 is still allowed; the requirement asks for 1.3.", p.line);
  }
  return fail("The gcp.restrictTLSVersion policy doesn't deny the older TLS versions.", p.line);
});

// Encryption at rest ----------------------------------------------------------

const encryptionAtRest = bucket((b) => {
  if (b.kmsKey) return pass("Objects are encrypted at rest with a customer-managed Cloud KMS key (CMEK).", b.kmsKey);
  return pass("Cloud Storage always encrypts data at rest (with Google-managed keys unless a CMEK is set); it can't be turned off.", b.res.block.line);
});

const restrictKeysOnWrite = bucket((b, t) => {
  const p = policy(t, "gcp.restrictCmekCryptoKeyProjects");
  if (p) return pass("Organisation policy restricts which projects' KMS keys can be used (gcp.restrictCmekCryptoKeyProjects).", p.line);
  if (b.kmsKey) {
    return warn(
      "A default CMEK is set, but writers can still name a different key per object. Add a gcp.restrictCmekCryptoKeyProjects organisation policy.",
      b.kmsKey,
    );
  }
  return fail("Nothing restricts which KMS keys may be used to write to this bucket.", b.res.block.line);
});

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template(() =>
  pass("Admin Activity audit logs are always written for Cloud Storage configuration changes and can't be turned off; they're kept for 400 days."),
);

function dataEventsLogged(kind: "write" | "read") {
  const type = kind === "write" ? "DATA_WRITE" : "DATA_READ";
  return bucket((b, t) => {
    const audit = t.auditConfigs.find((c) => c.types.has(type));
    if (audit) return pass(`Data Access audit logs (${type}) are enabled for Cloud Storage.`, audit.line);
    if (b.logging) return pass("Usage logs are enabled, recording each request with requester, time, operation and status.", b.logging.line);
    return fail(`Data Access audit logs (${type}) are off by default for Cloud Storage, and no usage logs are configured, so object ${kind}s aren't logged.`, b.res.block.line);
  });
}

const logsSeparatedFromResource = bucket((b, t) => {
  if (b.logging) {
    if (references(b.logging.target, b.res.address) || (b.name && t.model.str(b.logging.target) === b.name)) {
      return fail("Usage logs are delivered into the same bucket they record, so anyone with access to the bucket can reach its logs.", b.logging.line);
    }
    return pass("Usage logs are delivered to a separate bucket.", b.logging.line);
  }
  if (t.auditConfigs.length) return pass("Audit logs are written to Cloud Logging, separate from the bucket.", t.auditConfigs[0].line);
  return na("No access logs are configured for this bucket (see CCC.Core.CN04).");
});

// Access ----------------------------------------------------------------------

const noAnonymousAccess = bucket((b) => {
  const member = b.publicMembers[0];
  if (member) return fail(`IAM grants a role on this bucket to "${member.value}".`, member.line);
  const acl = b.acls.find((a) => PUBLIC_MEMBERS.some((m) => a.value.includes(m)) || PUBLIC_PREDEFINED_ACLS.includes(a.value));
  if (acl) return fail(`An ACL grants access to everyone (${acl.value}).`, acl.line);
  if (b.publicAccessPrevention?.value === "enforced") {
    return warn("No anonymous grants, and public access prevention is enforced. Whether named principals are authorised can only be confirmed with a live test.", b.publicAccessPrevention.line);
  }
  return warn("No anonymous grants found in this template. Confirm with a live test: IAM granted at project or folder level may still allow access.", b.res.block.line);
});

const uniformAccess = bucket((b, t) => {
  const acl = b.acls[0];
  if (b.uniform?.value === true) {
    if (acl) return fail("Uniform bucket-level access is on, but an ACL resource is still declared; remove it.", acl.line);
    return pass("Uniform bucket-level access is enabled, so object ACLs are disabled and only IAM applies.", b.uniform.line);
  }
  const p = policy(t, "storage.uniformBucketLevelAccess");
  if (p?.enforced) return pass("Organisation policy enforces uniform bucket-level access.", p.line);
  if (acl) return fail("Fine-grained ACLs are in use, so object-level permissions can diverge from the bucket.", acl.line);
  return fail("uniform_bucket_level_access isn't true. The google provider defaults to fine-grained (per-object) ACLs.", b.uniform?.line ?? b.res.block.line);
});

const publicAccessPrevention = bucket((b, t) => {
  const pap = b.publicAccessPrevention;
  if (pap?.value === "enforced") return pass("public_access_prevention is enforced.", pap.line);
  const p = policy(t, "storage.publicAccessPrevention");
  if (p?.enforced) return pass("Organisation policy enforces public access prevention.", p.line);
  return warn(
    `public_access_prevention is ${pap?.value ? `"${pap.value}"` : "not set"}, so it follows an organisation policy this template doesn't define. Set it to "enforced".`,
    pap?.line ?? b.res.block.line,
  );
});

// Data protection -------------------------------------------------------------

const days = (s: number) => Math.round((s / 86400) * 10) / 10;

const versioningEnabled = bucket((b) => {
  if (b.versioning?.value) return pass("Object Versioning is enabled, so earlier generations are kept.", b.versioning.line);
  const sd = b.softDeleteSeconds;
  if (sd?.value) {
    return warn(`Soft delete keeps deleted and overwritten objects restorable for ${days(sd.value)} day(s), but Object Versioning isn't enabled.`, sd.line);
  }
  return fail("Object Versioning isn't enabled, so overwritten or deleted objects can't be recovered.", b.versioning?.line ?? b.res.block.line);
});

const deletionRecoverable = bucket((b) => {
  const sd = b.softDeleteSeconds;
  if (sd && sd.value === 0) return fail("Soft delete is disabled (retention_duration_seconds = 0), so a deleted bucket can't be restored.", sd.line);
  if (sd?.value) return pass(`Soft delete keeps a deleted bucket and its objects restorable for ${days(sd.value)} day(s).`, sd.line);
  if (b.retention?.seconds) return pass("A bucket holding objects under a retention policy can't be emptied or deleted.", b.retention.line);
  return warn("No soft_delete_policy is declared. Cloud Storage defaults to 7 days of soft delete, but pin it so drift is detectable.", b.res.block.line);
});

const retentionIrrevocable = bucket((b) => {
  const r = b.retention;
  if (!r) return fail("No retention policy, so there's nothing to protect.", b.res.block.line);
  if (r.locked) return pass("The retention policy is locked (Bucket Lock), so it can't be reduced or removed.", r.line);
  return warn("The retention policy isn't locked (is_locked = false), so it can still be reduced or removed.", r.line);
});

const defaultRetentionApplied = bucket((b) => {
  const r = b.retention;
  if (!r?.seconds) return fail("No retention policy, so new objects aren't protected from deletion or overwrite.", b.res.block.line);
  return pass(`Every object is retained for ${days(r.seconds)} day(s) after it's written.`, r.line);
});

const retentionEnforced = bucket((b) => {
  const r = b.retention;
  if (!r) return fail("No retention policy, so deletes and overwrites aren't blocked.", b.res.block.line);
  if (r.locked) return pass("A locked retention policy blocks deletion and overwrite until objects reach the retention period.", r.line);
  return warn("An unlocked retention policy blocks deletes and overwrites, but can be reduced or removed.", r.line);
});

const mfaDelete = bucket((b) => {
  if (b.retention?.locked) {
    return warn(
      "Cloud Storage has no MFA-delete setting. A locked retention policy blocks deletion during the retention period instead; requiring MFA needs IAM conditions or context-aware access, which aren't visible here.",
      b.retention.line,
    );
  }
  return fail("Cloud Storage has no MFA-delete setting, and nothing in this template blocks deletion (consider a locked retention policy).", b.res.block.line);
});

const approvedStorageClasses = bucket((b, t) => {
  if (!b.classes.length) return na("No non-standard storage class or lifecycle transitions are configured.");
  const bad = b.classes.find((x) => !isApprovedClass(x.value, t.settings));
  if (bad) return fail(`Objects are stored in or moved to ${bad.value}, which isn't an approved class.`, bad.line);
  return pass(`All storage classes are approved (${[...new Set(b.classes.map((x) => x.value))].join(", ")}).`, b.classes[0].line);
});

// Location --------------------------------------------------------------------

/** Single regions look like "europe-west2"; multi- and dual-regions like "EU" or "NAM4". */
const isSingleRegion = (loc: string) => /^[a-z]+-[a-z]+\d+$/i.test(loc);

const regionTrusted = bucket((b, t) => {
  const loc = b.location;
  if (b.dataLocations.length) {
    const bad = b.dataLocations.find((d) => !isTrusted(d, t.settings));
    if (bad) return fail(`The dual-region bucket stores data in ${bad}, which isn't in the trusted list.`, loc?.line ?? b.res.block.line);
    return pass(`The dual-region bucket stores data only in trusted regions (${b.dataLocations.join(", ")}).`, loc?.line ?? b.res.block.line);
  }
  if (!loc?.value) return warn("The location is unknown or computed at apply time.", loc?.line ?? b.res.block.line);
  if (isTrusted(loc.value, t.settings)) return pass(`Stored in ${loc.value}, which is in the trusted list.`, loc.line);
  return fail(`Stored in ${loc.value}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, loc.line);
});

const childRegionsTrusted = template((t) =>
  locationsTrusted(t, "google_", "Google Cloud", (r) => {
    // A configurable dual-region bucket stores data in its data_locations, not the "EU"/"US" code.
    const dual = t.buckets.find((b) => b.res === r && b.dataLocations.length);
    if (dual) return dual.dataLocations.find((d) => !isTrusted(d, t.settings)) ?? dual.dataLocations[0];
    const a = r.block.attrs.location ?? r.block.attrs.region;
    return a ? (t.model.str(a.value) ?? undefined) : null;
  }),
);

const replicationInPerimeter = bucket((b, t) => {
  const loc = b.location?.value;
  const line = b.location?.line ?? b.res.block.line;
  if (b.dataLocations.length) {
    const bad = b.dataLocations.find((d) => !isTrusted(d, t.settings));
    if (bad) return fail(`The dual-region bucket replicates to ${bad}, outside the trusted list.`, line);
    return pass(`The dual-region bucket replicates only between trusted regions (${b.dataLocations.join(", ")}).`, line);
  }
  if (!loc) return warn("The location is unknown, so replication can't be checked.", line);
  if (isSingleRegion(loc)) return na("Single-region bucket; data isn't replicated to another region.");
  if (isTrusted(loc, t.settings)) return pass(`The ${loc} multi-region is in the trusted list.`, line);
  return fail(`${loc} is a multi- or dual-region location that replicates across several regions, and it isn't in the trusted list.`, line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const gcp: ProviderRules<GcsBucketView, GcpView> = {
  id: "gcp",
  label: "Google Cloud",
  prefix: "google_",
  build: buildGcpView,
  rules: {
    // CCC.Core.CN01.AR03 (deny plain HTTP) has no Cloud Storage setting: live test only.
    "CCC.Core.CN01.AR01": minimumTls13,
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
    // CCC.ObjStor.CN08.AR01: Cloud Storage has no bucket setting that caps signed-URL lifetime: live test only.
    "CCC.ObjStor.CN07.AR01": mfaDelete,
    "CCC.ObjStor.CN07.AR02": mfaDelete,
    "CCC.ObjStor.CN09.AR01": publicAccessPrevention,
    "CCC.ObjStor.CN09.AR02": publicAccessPrevention,
    "CCC.ObjStor.CN10.AR01": approvedStorageClasses,
  },
};
