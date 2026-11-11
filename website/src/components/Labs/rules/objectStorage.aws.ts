/**
 * Static rules mapping AWS S3 Terraform configuration to CCC assessment requirements
 * for the CCC.ObjStor catalog (and the CCC.Core controls it imports).
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see IAM identity policies, SCPs, account-level
 * settings created elsewhere, or how the service behaves at runtime. The
 * authoritative checks are the behavioural tests in modules/features.
 *
 * Each rule is keyed by assessment-requirement ID. Requirements without a rule
 * are shown as "Live test only" in the UI.
 */

import type { HclBlock, HclValue } from "../hcl/parser";
import { readPolicy, references, subBlocks, type PolicyStatement, type TfModel, type TfResource } from "../terraform/model";
import type { LabsSettings } from "../types";
import { fail, first, formatSeconds, isApprovedClass, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "./common";

// ── Per-bucket view of the template ───────────────────────────────────────────

interface Located<T> {
  value: T;
  line: number;
}

export interface BucketView {
  res: TfResource;
  bucketName?: string;
  versioning?: { status?: string; mfaDelete?: string; line: number };
  sse?: { algorithm?: string; kmsKeyId?: string; line: number };
  publicAccessBlock?: { flags: Record<string, boolean | undefined>; line: number; account: boolean };
  ownership?: Located<string | undefined>;
  acls: Located<string | undefined>[];
  objectLockEnabled?: Located<boolean>;
  defaultRetention?: { mode?: string; days?: number; years?: number; line: number };
  logging?: { target?: HclValue; line: number };
  policies: { statements: PolicyStatement[]; opaque?: string; line: number }[];
  transitions: Located<string | undefined>[];
  replicationDestinations: Located<HclValue | undefined>[];
  region?: string;
}

export interface TemplateView extends BaseView<BucketView> {
  trails: TfResource[];
}

const PAB_FLAGS = ["block_public_acls", "block_public_policy", "ignore_public_acls", "restrict_public_buckets"] as const;

export function buildTemplateView(model: TfModel, settings: LabsSettings): TemplateView {
  const accountPab = first(model.ofType("aws_s3_account_public_access_block"));

  const buckets = model.ofType("aws_s3_bucket").map((res): BucketView => {
    const b = res.block;
    const bucketName = model.str(b.attrs.bucket?.value);

    /** Companion resources (aws_s3_bucket_*) whose `bucket` argument points at this bucket. */
    const linked = (type: string) =>
      model.ofType(type).filter((r) => {
        const v = r.block.attrs.bucket?.value;
        return references(v, res.address) || (bucketName !== undefined && model.str(v) === bucketName);
      });

    const view: BucketView = { res, bucketName, acls: [], policies: [], transitions: [], replicationDestinations: [], region: model.regionFor(res) };

    // Versioning (standalone resource, or legacy inline block)
    const ver = first(linked("aws_s3_bucket_versioning"));
    if (ver) {
      const cfg = first(subBlocks(ver.block, "versioning_configuration"));
      view.versioning = { status: model.str(cfg?.attrs.status?.value), mfaDelete: model.str(cfg?.attrs.mfa_delete?.value), line: cfg?.line ?? ver.block.line };
    } else {
      const inline = first(subBlocks(b, "versioning"));
      if (inline) {
        const enabled = model.bool(inline.attrs.enabled?.value);
        const mfa = model.bool(inline.attrs.mfa_delete?.value);
        view.versioning = { status: enabled ? "Enabled" : enabled === false ? "Suspended" : undefined, mfaDelete: mfa ? "Enabled" : "Disabled", line: inline.line };
      }
    }

    // Encryption at rest
    const sseBlock = first(linked("aws_s3_bucket_server_side_encryption_configuration"))?.block ?? first(subBlocks(b, "server_side_encryption_configuration"));
    if (sseBlock) {
      const def = first(subBlocks(first(subBlocks(sseBlock, "rule")) ?? sseBlock, "apply_server_side_encryption_by_default"));
      view.sse = { algorithm: model.str(def?.attrs.sse_algorithm?.value), kmsKeyId: def?.attrs.kms_master_key_id ? "set" : undefined, line: def?.line ?? sseBlock.line };
    }

    // Public access block (bucket-level wins; account-level also counts)
    const pab = first(linked("aws_s3_bucket_public_access_block")) ?? accountPab;
    if (pab) {
      view.publicAccessBlock = {
        flags: Object.fromEntries(PAB_FLAGS.map((f) => [f, model.bool(pab.block.attrs[f]?.value)])),
        line: pab.block.line,
        account: pab === accountPab,
      };
    }

    // Ownership controls and ACLs
    const own = first(linked("aws_s3_bucket_ownership_controls"));
    if (own) {
      const rule = first(subBlocks(own.block, "rule"));
      view.ownership = { value: model.str(rule?.attrs.object_ownership?.value), line: rule?.attrs.object_ownership?.line ?? own.block.line };
    }
    for (const acl of linked("aws_s3_bucket_acl")) {
      view.acls.push({ value: model.str(acl.block.attrs.acl?.value) ?? (subBlocks(acl.block, "access_control_policy").length ? "custom grants" : undefined), line: acl.block.line });
    }
    if (b.attrs.acl) view.acls.push({ value: model.str(b.attrs.acl.value), line: b.attrs.acl.line });

    // Object lock
    const olAttr = b.attrs.object_lock_enabled;
    const inlineOl = first(subBlocks(b, "object_lock_configuration"));
    if (olAttr) view.objectLockEnabled = { value: model.bool(olAttr.value) === true, line: olAttr.line };
    else if (inlineOl) view.objectLockEnabled = { value: model.str(inlineOl.attrs.object_lock_enabled?.value) === "Enabled", line: inlineOl.line };
    const olCfg = first(linked("aws_s3_bucket_object_lock_configuration"))?.block ?? inlineOl;
    const ret = olCfg && first(subBlocks(first(subBlocks(olCfg, "rule")) ?? olCfg, "default_retention"));
    if (ret) {
      view.defaultRetention = { mode: model.str(ret.attrs.mode?.value), days: model.num(ret.attrs.days?.value), years: model.num(ret.attrs.years?.value), line: ret.line };
    }
    // A standalone object lock configuration for a bucket implies the bucket has object lock enabled.
    if (!view.objectLockEnabled && linked("aws_s3_bucket_object_lock_configuration").length) {
      view.objectLockEnabled = { value: true, line: linked("aws_s3_bucket_object_lock_configuration")[0].block.line };
    }

    // Access logging
    const log = first(linked("aws_s3_bucket_logging"));
    if (log) view.logging = { target: log.block.attrs.target_bucket?.value, line: log.block.line };
    else {
      const inline = first(subBlocks(b, "logging"));
      if (inline) view.logging = { target: inline.attrs.target_bucket?.value, line: inline.line };
    }

    // Bucket policies
    for (const p of linked("aws_s3_bucket_policy")) view.policies.push(readPolicy(model, p.block.attrs.policy?.value, p.block.line));
    if (b.attrs.policy) view.policies.push(readPolicy(model, b.attrs.policy.value, b.attrs.policy.line));

    // Lifecycle transitions
    const lifecycleRules: HclBlock[] = [
      ...linked("aws_s3_bucket_lifecycle_configuration").flatMap((l) => subBlocks(l.block, "rule")),
      ...subBlocks(b, "lifecycle_rule"),
    ];
    for (const rule of lifecycleRules) {
      for (const t of [...subBlocks(rule, "transition"), ...subBlocks(rule, "noncurrent_version_transition")]) {
        view.transitions.push({ value: model.str(t.attrs.storage_class?.value), line: t.line });
      }
    }

    // Replication destinations
    const repl = [...linked("aws_s3_bucket_replication_configuration").map((r) => r.block), ...subBlocks(b, "replication_configuration")];
    for (const r of repl) {
      for (const rule of subBlocks(r, "rule").concat(subBlocks(r, "rules"))) {
        for (const d of subBlocks(rule, "destination")) view.replicationDestinations.push({ value: d.attrs.bucket?.value, line: d.line });
      }
    }

    return view;
  });

  return { model, buckets, trails: model.ofType("aws_cloudtrail"), settings };
}

// ── Policy helpers ────────────────────────────────────────────────────────────

function findDeny(view: BucketView, variable: string): { stmt: PolicyStatement; values: string[]; test: string } | undefined {
  for (const p of view.policies) {
    for (const s of p.statements) {
      if (s.effect !== "Deny") continue;
      const c = s.conditions.find((c) => c.variable.toLowerCase() === variable.toLowerCase());
      if (c) return { stmt: s, values: c.values, test: c.test };
    }
  }
  return undefined;
}

function opaquePolicy(view: BucketView) {
  return view.policies.find((p) => p.opaque);
}

function anonymousAllows(view: BucketView): PolicyStatement[] {
  return view.policies.flatMap((p) => p.statements).filter((s) => s.effect === "Allow" && s.principals.includes("*") && s.conditions.length === 0);
}

const PUBLIC_ACLS = ["public-read", "public-read-write", "authenticated-read"];

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<BucketView, TemplateView>();

// Encryption in transit -------------------------------------------------------

const denyInsecureTransport = bucket((b) => {
  const d = findDeny(b, "aws:SecureTransport");
  if (d && d.values.map((v) => v.toLowerCase()).includes("false")) {
    return pass("Bucket policy denies requests where aws:SecureTransport is false.", d.stmt.line);
  }
  const o = opaquePolicy(b);
  if (o) return warn(`A bucket policy is attached but couldn't be read (${o.opaque}).`, o.line);
  return fail("No bucket policy statement denies requests with aws:SecureTransport = false. S3 accepts plain HTTP unless a policy denies it.", b.res.block.line);
});

const minimumTls13 = bucket((b) => {
  const d = findDeny(b, "s3:TlsVersion");
  if (d) {
    const v = Math.max(...d.values.map(Number).filter((n) => !Number.isNaN(n)));
    if (v >= 1.3) return pass(`Bucket policy denies requests with s3:TlsVersion below ${v}.`, d.stmt.line);
    return warn(`Bucket policy enforces TLS ${v} or higher, but the requirement is TLS 1.3.`, d.stmt.line);
  }
  return fail('No Deny statement with an "s3:TlsVersion" NumericLessThan 1.3 condition.', b.res.block.line);
});

// Encryption at rest ----------------------------------------------------------

const encryptionAtRest = bucket((b) => {
  if (!b.sse) {
    return warn("No server-side encryption configuration declared. S3 applies SSE-S3 by default, but declare it explicitly so drift is detectable.", b.res.block.line);
  }
  const alg = b.sse.algorithm;
  if (alg === "aws:kms" || alg === "aws:kms:dsse") return pass(`Default encryption uses ${alg} (customer-managed KMS keys).`, b.sse.line);
  if (alg === "AES256") return pass("Default encryption uses SSE-S3 (AES-256).", b.sse.line);
  return warn(`Unrecognised or computed sse_algorithm${alg ? ` "${alg}"` : ""}.`, b.sse.line);
});

const restrictKmsKeysOnWrite = bucket((b) => {
  const d = findDeny(b, "s3:x-amz-server-side-encryption-aws-kms-key-id");
  if (d) return pass("Bucket policy denies writes that specify a KMS key other than the trusted key(s).", d.stmt.line);
  if (b.sse?.kmsKeyId) {
    return warn("A default KMS key is configured, but callers can still request a different key. Add a Deny on s3:x-amz-server-side-encryption-aws-kms-key-id.", b.sse.line);
  }
  return fail("Nothing restricts which KMS keys may be used to write to this bucket.", b.res.block.line);
});

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template((t) => {
  if (!t.trails.length) return fail("No aws_cloudtrail resource. Management (configuration) events are only kept for 90 days in Event History without a trail.");
  const tr = t.trails[0];
  if (t.model.bool(tr.block.attrs.enable_logging?.value) === false) return fail("CloudTrail is declared with enable_logging = false.", tr.block.attrs.enable_logging?.line);
  const selectors = subBlocks(tr.block, "event_selector");
  if (selectors.length && selectors.every((s) => t.model.bool(s.attrs.include_management_events?.value) === false)) {
    return fail("CloudTrail event selectors exclude management events.", selectors[0].line);
  }
  return pass(`${tr.address} records management events (who changed what, when, and the result).`, tr.block.line);
});

/** True when a data_resource's values cover this bucket: all buckets ("arn:aws:s3"), or this bucket by reference or name. */
function selectsBucket(b: BucketView, t: TemplateView, values: HclValue | undefined): boolean {
  const resolved = t.model.resolve(values);
  const items = resolved?.t === "list" ? resolved.items : resolved ? [resolved] : [];
  return items.some((v) => {
    const s = t.model.str(v) ?? (v.t === "str" ? v.v : "");
    return /^arn:aws:s3(:::)?\/?$/.test(s) || references(v, b.res.address) || (!!b.bucketName && s.includes(`:::${b.bucketName}/`));
  });
}

function dataEventsLogged(kind: "write" | "read") {
  return bucket((b, t) => {
    if (b.logging) return pass("S3 server access logging is enabled (records requester, time, operation and status).", b.logging.line);
    for (const tr of t.trails) {
      for (const s of subBlocks(tr.block, "event_selector")) {
        const rw = t.model.str(s.attrs.read_write_type?.value) ?? "All";
        const covers = rw === "All" || (kind === "write" ? rw === "WriteOnly" : rw === "ReadOnly");
        const selected = subBlocks(s, "data_resource").some((d) => t.model.str(d.attrs.type?.value) === "AWS::S3::Object" && selectsBucket(b, t, d.attrs.values?.value));
        if (covers && selected) {
          return pass(`${tr.address} captures S3 object ${kind} data events.`, s.line);
        }
      }
      for (const s of subBlocks(tr.block, "advanced_event_selector")) {
        if (subBlocks(s, "field_selector").some((f) => t.model.strList(f.attrs.equals?.value).includes("AWS::S3::Object"))) {
          return pass(`${tr.address} captures S3 object data events (advanced selector).`, s.line);
        }
      }
    }
    return fail(`No server access logging or CloudTrail S3 data events, so object ${kind}s aren't logged.`, b.res.block.line);
  });
}

const logsSeparatedFromResource = bucket((b, t) => {
  if (b.logging) {
    if (references(b.logging.target, b.res.address) || (b.bucketName && t.model.str(b.logging.target) === b.bucketName)) {
      return fail("Access logs are delivered into the same bucket they record, so anyone with access to the bucket can reach its logs.", b.logging.line);
    }
    return pass("Access logs are delivered to a separate bucket.", b.logging.line);
  }
  if (t.trails.some((tr) => !references(tr.block.attrs.s3_bucket_name?.value, b.res.address))) {
    return pass("CloudTrail delivers logs to a separate bucket.", t.trails[0].block.line);
  }
  return na("No access logs are configured for this bucket (see CCC.Core.CN04).");
});

// Access ----------------------------------------------------------------------

const noAnonymousAccess = bucket((b) => {
  const open = anonymousAllows(b);
  if (open.length) return fail('Bucket policy has an unconditional Allow for Principal "*" (anonymous access).', open[0].line);
  const publicAcl = b.acls.find((a) => a.value && PUBLIC_ACLS.includes(a.value));
  if (publicAcl) return fail(`Bucket ACL "${publicAcl.value}" grants access to everyone.`, publicAcl.line);
  const pab = b.publicAccessBlock;
  if (pab && PAB_FLAGS.every((f) => pab.flags[f])) {
    return warn("No anonymous grants, and public access is blocked. Whether named principals are authorised can only be confirmed with a live test.", pab.line);
  }
  return warn("No anonymous grants found in this template. Confirm with a live test: IAM identity policies elsewhere may still grant access.", b.res.block.line);
});

const uniformBucketAccess = bucket((b) => {
  const acl = b.acls[0];
  if (b.ownership?.value === "BucketOwnerEnforced") {
    if (acl) return fail("Object ownership is BucketOwnerEnforced but an ACL is still declared; remove the aws_s3_bucket_acl.", acl.line);
    return pass("Object ownership is BucketOwnerEnforced, so ACLs are disabled and only the bucket policy applies.", b.ownership.line);
  }
  if (b.ownership) return fail(`Object ownership is "${b.ownership.value ?? "unknown"}", which lets per-object ACLs override bucket permissions.`, b.ownership.line);
  if (acl) return fail("An ACL is declared, which lets object-level permissions diverge from the bucket.", acl.line);
  return warn("No aws_s3_bucket_ownership_controls. New buckets default to BucketOwnerEnforced, but pin it so drift is detectable.", b.res.block.line);
});

const publicAccessBlock = bucket((b) => {
  const pab = b.publicAccessBlock;
  if (!pab) return warn("No public access block declared. AWS enables it on new buckets by default, but pin it so drift is detectable.", b.res.block.line);
  const off = PAB_FLAGS.filter((f) => pab.flags[f] !== true);
  if (off.length) return fail(`Public access block doesn't set ${off.join(", ")} to true.`, pab.line);
  return pass(`All four public access block settings are enabled${pab.account ? " at account level" : ""}.`, pab.line);
});

// Data protection -------------------------------------------------------------

const versioningEnabled = bucket((b) => {
  if (!b.versioning) return fail("Versioning isn't configured, so overwritten or deleted objects can't be recovered.", b.res.block.line);
  if (b.versioning.status === "Enabled") return pass("Versioning is Enabled.", b.versioning.line);
  return fail(`Versioning status is "${b.versioning.status ?? "unknown"}", not Enabled.`, b.versioning.line);
});

const mfaDelete = bucket((b) => {
  if (b.versioning?.mfaDelete === "Enabled") return pass("MFA delete is enabled on the versioning configuration.", b.versioning.line);
  return fail('MFA delete isn\'t enabled (set versioning_configuration.mfa_delete = "Enabled"; this requires root credentials and the mfa argument).', b.versioning?.line ?? b.res.block.line);
});

const bucketDeletionProtected = bucket((b) => {
  if (b.objectLockEnabled?.value) return pass("Object lock is enabled; a bucket holding locked object versions can't be deleted.", b.objectLockEnabled.line);
  return fail("Object lock isn't enabled, so the bucket and its contents can be deleted.", b.res.block.attrs.force_destroy?.line ?? b.res.block.line);
});

const retentionIrrevocable = bucket((b) => {
  const r = b.defaultRetention;
  if (!b.objectLockEnabled?.value) return fail("Object lock isn't enabled, so there's no retention policy to protect.", b.res.block.line);
  if (!r) return fail("Object lock is enabled but has no default retention rule.", b.objectLockEnabled.line);
  if (r.mode === "COMPLIANCE") return pass("Default retention uses COMPLIANCE mode, which no user (including root) can shorten or remove.", r.line);
  return warn(`Default retention uses ${r.mode ?? "an unknown"} mode, which identities with s3:BypassGovernanceRetention can override.`, r.line);
});

const defaultRetentionApplied = bucket((b) => {
  const r = b.defaultRetention;
  if (!b.objectLockEnabled?.value || !r) return fail("No object lock default retention, so new objects aren't protected from deletion or overwrite.", b.objectLockEnabled?.line ?? b.res.block.line);
  const period = r.years ? `${r.years} year(s)` : r.days ? `${r.days} day(s)` : undefined;
  if (!period) return warn("Default retention is declared without a period.", r.line);
  return pass(`New objects get ${r.mode ?? ""} retention for ${period} automatically.`, r.line);
});

const retentionEnforced = bucket((b) => {
  const r = b.defaultRetention;
  if (!b.objectLockEnabled?.value || !r) return fail("No object lock retention, so deletes and overwrites aren't blocked.", b.res.block.line);
  if (r.mode === "COMPLIANCE") return pass("COMPLIANCE-mode retention blocks deletion and overwrite of protected versions.", r.line);
  return warn("GOVERNANCE-mode retention can be bypassed by privileged identities.", r.line);
});

const presignedUrlExpiry = bucket((b, t) => {
  const d = findDeny(b, "s3:signatureAge");
  const max = t.settings.maxPresignedUrlSeconds;
  if (d) {
    const ms = Math.min(...d.values.map(Number).filter((n) => !Number.isNaN(n)));
    if (Number.isFinite(ms) && ms / 1000 <= max) return pass(`Bucket policy denies signatures older than ${formatSeconds(ms / 1000)}.`, d.stmt.line);
    return fail(`Bucket policy allows signatures up to ${formatSeconds(ms / 1000)}, above the ${formatSeconds(max)} threshold.`, d.stmt.line);
  }
  return fail(`No Deny on s3:signatureAge, so pre-signed URLs can live up to 7 days (threshold: ${formatSeconds(max)}).`, b.res.block.line);
});

const approvedStorageClasses = bucket((b, t) => {
  if (!b.transitions.length) return na("No lifecycle transitions are configured.");
  const bad = b.transitions.find((x) => !x.value || !isApprovedClass(x.value, t.settings));
  if (bad) return fail(`Lifecycle transitions to ${bad.value ?? "a computed storage class"}, which isn't an approved tier.`, bad.line);
  return pass(`All lifecycle transitions target approved tiers (${[...new Set(b.transitions.map((x) => x.value))].join(", ")}).`, b.transitions[0].line);
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((b, t) => {
  const { line } = t.model.awsRegion();
  if (!b.region) return warn("The region is unknown or computed at apply time (e.g. from an environment variable).", line ?? b.res.block.line);
  if (isTrusted(b.region, t.settings)) return pass(`Deployed to ${b.region}, which is in the trusted list.`, line);
  return fail(`Deployed to ${b.region}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "aws_", "AWS", (r) => t.model.regionFor(r)));

const replicationInPerimeter = bucket((b, t) => {
  if (!b.replicationDestinations.length) return na("No replication is configured.");
  for (const d of b.replicationDestinations) {
    const target = t.buckets.find((x) => references(d.value, x.res.address));
    if (!target) return warn("The replication destination isn't defined in this template, so its location can't be checked.", d.line);
    if (!target.region || !isTrusted(target.region, t.settings)) {
      return fail(`Replicates to ${target.res.address} in ${target.region ?? "an unknown region"}, outside the trusted list.`, d.line);
    }
  }
  return pass("All replication destinations are in trusted regions.", b.replicationDestinations[0].line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

const RULES: Record<string, ReturnType<typeof bucket>> = {
  // CCC.Core (imported by CCC.ObjStor)
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

  // CCC.ObjStor
  "CCC.ObjStor.CN01.AR03": restrictKmsKeysOnWrite,
  "CCC.ObjStor.CN01.AR04": restrictKmsKeysOnWrite,
  "CCC.ObjStor.CN02.AR01": uniformBucketAccess,
  "CCC.ObjStor.CN02.AR02": uniformBucketAccess,
  "CCC.ObjStor.CN03.AR01": bucketDeletionProtected,
  "CCC.ObjStor.CN03.AR02": retentionIrrevocable,
  "CCC.ObjStor.CN04.AR01": defaultRetentionApplied,
  "CCC.ObjStor.CN04.AR02": retentionEnforced,
  "CCC.ObjStor.CN05.AR01": versioningEnabled,
  "CCC.ObjStor.CN05.AR02": versioningEnabled,
  "CCC.ObjStor.CN05.AR03": versioningEnabled,
  "CCC.ObjStor.CN05.AR04": versioningEnabled,
  "CCC.ObjStor.CN07.AR01": mfaDelete,
  "CCC.ObjStor.CN07.AR02": mfaDelete,
  "CCC.ObjStor.CN08.AR01": presignedUrlExpiry,
  "CCC.ObjStor.CN09.AR01": publicAccessBlock,
  "CCC.ObjStor.CN09.AR02": publicAccessBlock,
  "CCC.ObjStor.CN10.AR01": approvedStorageClasses,
};

export const aws: ProviderRules<BucketView, TemplateView> = {
  id: "aws",
  label: "AWS",
  prefix: "aws_",
  build: buildTemplateView,
  rules: RULES,
};
