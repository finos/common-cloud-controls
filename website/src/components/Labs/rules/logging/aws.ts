/**
 * Static rules mapping AWS logging Terraform (CloudTrail, CloudWatch Logs, VPC flow logs and
 * the S3 buckets that hold log files) to CCC assessment requirements for the CCC.Logging
 * catalog and the CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see SCPs or trails created in other accounts,
 * IAM identity policies, or how the service behaves at runtime.
 *
 * The primary resources ("log stores") are CloudWatch log groups and the S3 buckets
 * that a trail, a flow log or S3 access logging writes into. Account-level checks
 * (is there a trail, are flow logs on, is tampering alerted) are template-wide.
 * Requirements without a rule are shown as "Live test only" in the UI.
 */

import type { HclValue } from "../../hcl/parser";
import { readPolicy, references, subBlocks, textOf, type ParsedPolicy, type PolicyStatement, type TfModel, type TfResource } from "../../terraform/model";
import type { Evidence, LabsSettings } from "../../types";
import { fail, first, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

// ── View ──────────────────────────────────────────────────────────────────────

interface Located<T> {
  value: T;
  line: number;
}

export interface LogStoreView {
  res: TfResource;
  kind: "group" | "bucket";
  name?: string;
  region?: string;
  /** Addresses of the trails, flow logs and buckets that write into this store. */
  sources: string[];
  /** Log groups: retention_in_days (undefined value = computed; absent = never expire). */
  retentionDays?: Located<number | undefined>;
  /** Line of a customer-managed KMS key (log group kms_key_id, bucket SSE-KMS key or the trail's kms_key_id). */
  cmk?: number;
  sse?: { algorithm?: string; line: number };
  publicAccessBlock?: { flags: Record<string, boolean | undefined>; line: number; account: boolean };
  acls: Located<string | undefined>[];
  policies: ParsedPolicy[];
  objectLockEnabled?: Located<boolean>;
  defaultRetention?: { mode?: string; days?: number; line: number };
  expirationDays?: Located<number>;
  replicationDestinations: Located<HclValue | undefined>[];
}

interface MetricFilter {
  res: TfResource;
  pattern: string;
  metricNames: string[];
}

interface Alarm {
  res: TfResource;
  metricNames: string[];
  anomaly: boolean;
  actions: boolean;
}

export interface AwsLoggingView extends BaseView<LogStoreView> {
  trails: TfResource[];
  flowLogs: TfResource[];
  metricFilters: MetricFilter[];
  alarms: Alarm[];
  eventRules: { res: TfResource; pattern: string; targeted: boolean }[];
  scps: { res: TfResource; statements: PolicyStatement[] }[];
}

const PAB_FLAGS = ["block_public_acls", "block_public_policy", "ignore_public_acls", "restrict_public_buckets"] as const;
const PUBLIC_ACLS = ["public-read", "public-read-write", "authenticated-read"];
const COMPUTE = ["aws_instance", "aws_lambda_function", "aws_ecs_task_definition"];

/** Every string, reference and raw expression inside a value, joined, for pattern searches. */
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

function buildView(model: TfModel, settings: LabsSettings): AwsLoggingView {
  const trails = model.ofType("aws_cloudtrail");
  const flowLogs = model.ofType("aws_flow_log");
  const accessLogging = model.ofType("aws_s3_bucket_logging");
  const accountPab = first(model.ofType("aws_s3_account_public_access_block"));

  const groups = model.ofType("aws_cloudwatch_log_group").map((res): LogStoreView => {
    const a = res.block.attrs;
    const sources = [
      ...trails.filter((t) => references(t.block.attrs.cloud_watch_logs_group_arn?.value, res.address)),
      ...flowLogs.filter((f) => references(f.block.attrs.log_destination?.value, res.address) || references(f.block.attrs.log_group_name?.value, res.address)),
    ].map((r) => r.address);
    return {
      res,
      kind: "group",
      name: model.str(a.name?.value),
      region: model.regionFor(res),
      sources,
      retentionDays: a.retention_in_days ? { value: model.num(a.retention_in_days.value), line: a.retention_in_days.line } : undefined,
      cmk: a.kms_key_id?.line,
      acls: [],
      policies: [],
      replicationDestinations: [],
    };
  });

  const buckets: LogStoreView[] = [];
  for (const res of model.ofType("aws_s3_bucket")) {
    const b = res.block;
    const name = model.str(b.attrs.bucket?.value);
    const pointsHere = (v: HclValue | undefined) => references(v, res.address) || (name !== undefined && model.str(v) === name);
    const feeding = [
      ...trails.filter((t) => pointsHere(t.block.attrs.s3_bucket_name?.value)),
      ...flowLogs.filter((f) => references(f.block.attrs.log_destination?.value, res.address)),
      ...accessLogging.filter((l) => pointsHere(l.block.attrs.target_bucket?.value)),
    ];
    // Only buckets that receive logs are log stores; other buckets belong to the object-storage service.
    if (!feeding.length) continue;
    const linked = (type: string) => model.ofType(type).filter((r) => pointsHere(r.block.attrs.bucket?.value));

    const view: LogStoreView = {
      res,
      kind: "bucket",
      name,
      region: model.regionFor(res),
      sources: feeding.map((r) => r.address),
      acls: [],
      policies: [],
      replicationDestinations: [],
    };

    const sseBlock = first(linked("aws_s3_bucket_server_side_encryption_configuration"))?.block ?? first(subBlocks(b, "server_side_encryption_configuration"));
    if (sseBlock) {
      const def = first(subBlocks(first(subBlocks(sseBlock, "rule")) ?? sseBlock, "apply_server_side_encryption_by_default"));
      view.sse = { algorithm: model.str(def?.attrs.sse_algorithm?.value), line: def?.line ?? sseBlock.line };
      if (def?.attrs.kms_master_key_id) view.cmk = def.attrs.kms_master_key_id.line;
    }
    // CloudTrail encrypts the log files it delivers with its own kms_key_id, whatever the bucket default.
    const kmsTrail = trails.find((t) => pointsHere(t.block.attrs.s3_bucket_name?.value) && t.block.attrs.kms_key_id);
    if (kmsTrail && view.cmk === undefined) view.cmk = kmsTrail.block.attrs.kms_key_id!.line;

    const pab = first(linked("aws_s3_bucket_public_access_block")) ?? accountPab;
    if (pab) {
      view.publicAccessBlock = {
        flags: Object.fromEntries(PAB_FLAGS.map((f) => [f, model.bool(pab.block.attrs[f]?.value)])),
        line: pab.block.line,
        account: pab === accountPab,
      };
    }
    for (const acl of linked("aws_s3_bucket_acl")) view.acls.push({ value: model.str(acl.block.attrs.acl?.value), line: acl.block.line });
    if (b.attrs.acl) view.acls.push({ value: model.str(b.attrs.acl.value), line: b.attrs.acl.line });
    for (const p of linked("aws_s3_bucket_policy")) view.policies.push(readPolicy(model, p.block.attrs.policy?.value, p.block.line));
    if (b.attrs.policy) view.policies.push(readPolicy(model, b.attrs.policy.value, b.attrs.policy.line));

    const olAttr = b.attrs.object_lock_enabled;
    const olCfg = first(linked("aws_s3_bucket_object_lock_configuration"));
    if (olAttr) view.objectLockEnabled = { value: model.bool(olAttr.value) === true, line: olAttr.line };
    else if (olCfg) view.objectLockEnabled = { value: true, line: olCfg.block.line };
    const ret = olCfg && first(subBlocks(first(subBlocks(olCfg.block, "rule")) ?? olCfg.block, "default_retention"));
    if (ret) {
      const days = model.num(ret.attrs.days?.value);
      const years = model.num(ret.attrs.years?.value);
      view.defaultRetention = { mode: model.str(ret.attrs.mode?.value), days: days ?? (years !== undefined ? years * 365 : undefined), line: ret.line };
    }

    for (const lc of linked("aws_s3_bucket_lifecycle_configuration")) {
      for (const rule of subBlocks(lc.block, "rule")) {
        if (model.str(rule.attrs.status?.value) === "Disabled") continue;
        for (const exp of subBlocks(rule, "expiration")) {
          const d = model.num(exp.attrs.days?.value);
          if (d !== undefined && (!view.expirationDays || d < view.expirationDays.value)) view.expirationDays = { value: d, line: exp.attrs.days!.line };
        }
      }
    }

    for (const r of linked("aws_s3_bucket_replication_configuration")) {
      for (const rule of subBlocks(r.block, "rule")) {
        for (const d of subBlocks(rule, "destination")) view.replicationDestinations.push({ value: d.attrs.bucket?.value, line: d.line });
      }
    }
    buckets.push(view);
  }

  const metricFilters = model.ofType("aws_cloudwatch_log_metric_filter").map((res) => ({
    res,
    pattern: model.str(res.block.attrs.pattern?.value) ?? flatText(model, res.block.attrs.pattern?.value),
    metricNames: subBlocks(res.block, "metric_transformation").map((m) => model.str(m.attrs.name?.value) ?? ""),
  }));

  const alarms = model.ofType("aws_cloudwatch_metric_alarm").map((res) => {
    const a = res.block.attrs;
    const queries = subBlocks(res.block, "metric_query");
    const names = [a.metric_name, ...queries.flatMap((q) => subBlocks(q, "metric").map((m) => m.attrs.metric_name))]
      .filter((x) => x)
      .map((x) => model.str(x!.value) ?? flatText(model, x!.value));
    return {
      res,
      metricNames: names,
      anomaly: queries.some((q) => /ANOMALY_DETECTION_BAND/.test(model.str(q.attrs.expression?.value) ?? "")),
      actions: model.strList(a.alarm_actions?.value).length > 0,
    };
  });

  const targets = model.ofType("aws_cloudwatch_event_target");
  const eventRules = model.ofType("aws_cloudwatch_event_rule").map((res) => ({
    res,
    pattern: flatText(model, res.block.attrs.event_pattern?.value),
    targeted: targets.some((tg) => references(tg.block.attrs.rule?.value, res.address)),
  }));

  const scps = model
    .ofType("aws_organizations_policy")
    .filter((p) => (model.str(p.block.attrs.type?.value) ?? "SERVICE_CONTROL_POLICY") === "SERVICE_CONTROL_POLICY")
    .map((res) => ({ res, statements: readPolicy(model, res.block.attrs.content?.value, res.block.line).statements }));

  return { model, settings, buckets: [...groups, ...buckets], trails, flowLogs, metricFilters, alarms, eventRules, scps };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<LogStoreView, AwsLoggingView>();

const SEVERITY: Record<Evidence["status"], number> = { na: 0, pass: 1, manual: 2, warn: 3, fail: 4 };
const worstOf = (evs: Evidence[]): Evidence => evs.reduce((a, e) => (SEVERITY[e.status] > SEVERITY[a.status] ? e : a));

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

/** Metric filters whose pattern mentions any of `events`, with the alarms watching their metric. */
function alertsOn(t: AwsLoggingView, events: string[]) {
  return t.metricFilters
    .filter((f) => events.some((e) => f.pattern.includes(e)))
    .map((f) => ({
      filter: f,
      covered: events.filter((e) => f.pattern.includes(e)),
      // The alarm names the filter's metric, or references the filter (…metric_transformation[0].name).
      alarms: t.alarms.filter((a) => a.metricNames.some((n) => (n && f.metricNames.includes(n)) || n.includes(f.res.address))),
    }));
}

/** A trail-fed log group whose trail also delivers to a COMPLIANCE-locked bucket in this template. */
function lockedCopy(g: LogStoreView, t: AwsLoggingView): LogStoreView | undefined {
  const trails = t.trails.filter((tr) => g.sources.includes(tr.address));
  return t.buckets.find((b) => b.kind === "bucket" && b.objectLockEnabled?.value && b.defaultRetention?.mode === "COMPLIANCE" && trails.some((tr) => b.sources.includes(tr.address)));
}

// ── Rules: collection ─────────────────────────────────────────────────────────

const auditAndFlowLogsCentralised = template((t) => {
  const tr = t.trails.find((x) => t.model.bool(x.block.attrs.enable_logging?.value) !== false);
  if (!tr) {
    return t.trails.length
      ? fail("The trail is declared with enable_logging = false.", t.trails[0].block.attrs.enable_logging?.line)
      : fail("No aws_cloudtrail resource, so management events stay in the 90-day Event History and nothing sends them to a central sink.");
  }
  const flow = t.flowLogs[0];
  if (!flow) return fail(`${tr.address} records audit events, but there's no aws_flow_log, so network flows aren't captured.`, tr.block.line);
  const evs: Evidence[] = [];
  const org = t.model.bool(tr.block.attrs.is_organization_trail?.value) === true;
  if (t.model.bool(tr.block.attrs.is_multi_region_trail?.value) !== true) {
    evs.push(warn(`${tr.address} only records events in its home region; set is_multi_region_trail = true so new regions are covered automatically.`, tr.block.attrs.is_multi_region_trail?.line ?? tr.block.line));
  }
  const traffic = t.model.str(flow.block.attrs.traffic_type?.value);
  if (traffic && traffic !== "ALL") evs.push(warn(`${flow.address} only records ${traffic} traffic; set traffic_type = "ALL".`, flow.block.attrs.traffic_type!.line));
  evs.push(
    pass(
      `${tr.address} records management events${org ? " for every account in the organisation" : ""} and ${flow.address} records network flows, both delivered to central log stores.`,
      tr.block.line,
    ),
  );
  return worstOf(evs);
});

const computeForwardsLogs = template((t) => {
  const compute = t.model.resources.filter((r) => r.mode === "resource" && COMPUTE.includes(r.type));
  if (!compute.length) return na("No compute resources (EC2 instances, Lambda functions, ECS tasks) in this template.");
  const evs = compute.map((r): Evidence => {
    if (r.type === "aws_lambda_function") return pass(`${r.address} sends its logs to CloudWatch Logs automatically.`, r.block.line);
    if (r.type === "aws_ecs_task_definition") {
      const text = flatText(t.model, r.block.attrs.container_definitions?.value);
      if (/awslogs|logConfiguration|awsfirelens/.test(text)) return pass(`${r.address} configures a log driver for its containers.`, r.block.attrs.container_definitions?.line);
      return fail(`${r.address} has no logConfiguration, so container output isn't forwarded.`, r.block.line);
    }
    const ud = flatText(t.model, r.block.attrs.user_data?.value);
    if (/amazon-cloudwatch-agent/.test(ud)) return pass(`${r.address} installs the CloudWatch agent in its user data.`, r.block.attrs.user_data?.line);
    return warn(`${r.address} needs the CloudWatch agent to forward OS and application logs; it isn't installed in this template.`, r.block.line);
  });
  return worstOf(evs);
});

const adminActionsLogged = template((t) => {
  const tr = t.trails[0];
  if (!tr) return fail("No aws_cloudtrail resource. Changes to the logging configuration are only kept for 90 days in Event History.");
  if (t.model.bool(tr.block.attrs.enable_logging?.value) === false) return fail("CloudTrail is declared with enable_logging = false.", tr.block.attrs.enable_logging?.line);
  const selectors = subBlocks(tr.block, "event_selector");
  if (selectors.length && selectors.every((s) => t.model.bool(s.attrs.include_management_events?.value) === false)) {
    return fail("CloudTrail event selectors exclude management events.", selectors[0].line);
  }
  return pass(`${tr.address} records management events, including changes to trails, log groups and flow logs.`, tr.block.line);
});

// ── Rules: retention ──────────────────────────────────────────────────────────

const retentionMeetsPolicy = bucket((s, t) => {
  const min = t.settings.minLogRetentionDays;
  if (s.kind === "group") {
    const r = s.retentionDays;
    if (r && r.value === undefined) return warn("retention_in_days is computed, so the retention period can't be checked.", r.line);
    if (!r || r.value === 0) return warn(`retention_in_days isn't set, so events never expire. That keeps them for the ${min}-day minimum, but no retention policy is enforced.`, s.res.block.line);
    if (r.value! < min) return fail(`Events are deleted after ${days(r.value!)}, below the ${min}-day retention policy.`, r.line);
    return pass(`Events are kept for ${days(r.value!)} (policy: at least ${days(min)}).`, r.line);
  }
  const exp = s.expirationDays;
  const lock = s.objectLockEnabled?.value ? s.defaultRetention : undefined;
  if (exp && exp.value < min) return fail(`A lifecycle rule expires log files after ${days(exp.value)}, below the ${min}-day retention policy.`, exp.line);
  if (lock?.days !== undefined && lock.days >= min) return pass(`Object lock retains every log file for ${days(lock.days)} (policy: at least ${days(min)}).`, lock.line);
  if (exp) return pass(`A lifecycle rule keeps log files for ${days(exp.value)} before expiring them (policy: at least ${days(min)}).`, exp.line);
  return warn("No lifecycle expiration or object lock retention, so retention isn't enforced: log files stay until someone deletes them.", s.res.block.line);
});

const expiredLogsRemoved = bucket((s, t) => {
  const min = t.settings.minLogRetentionDays;
  const r = s.kind === "group" ? s.retentionDays : s.expirationDays;
  if (r && r.value === undefined) return warn("The retention period is computed, so it can't be checked.", r.line);
  if (!r || !r.value) {
    return fail(
      s.kind === "group"
        ? `Events never expire, so a query for events older than ${days(min)} still returns them.`
        : `No lifecycle expiration, so log files older than ${days(min)} are never removed.`,
      s.res.block.line,
    );
  }
  if (r.value > min) return warn(`Logs are kept for ${days(r.value)}, so queries for events between ${days(min)} and ${days(r.value)} old still return results.`, r.line);
  return pass(`Logs are deleted after ${days(r.value)}, so nothing older than the retention period can be queried.`, r.line);
});

// ── Rules: immutability ───────────────────────────────────────────────────────

const logsImmutable = bucket((s, t) => {
  if (s.kind === "group") {
    const copy = lockedCopy(s, t);
    if (copy) return pass(`CloudWatch Logs has no object lock, but the trail feeding this group also delivers every event to ${copy.res.address}, which is under COMPLIANCE-mode object lock.`, copy.defaultRetention!.line);
    return fail("CloudWatch Logs has no WORM option: the log group and its events can be deleted at any time (logs:DeleteLogGroup). Deliver a copy to an object-locked S3 bucket.", s.res.block.line);
  }
  const r = s.defaultRetention;
  if (!s.objectLockEnabled?.value) return fail("Object lock isn't enabled, so log files can be overwritten or deleted.", s.objectLockEnabled?.line ?? s.res.block.line);
  if (!r) return fail("Object lock is enabled but has no default retention rule, so new log files aren't locked.", s.objectLockEnabled.line);
  if (r.mode === "COMPLIANCE") return pass("Default retention uses COMPLIANCE mode: no one, including root, can delete or overwrite log files before it expires.", r.line);
  return warn(`Default retention uses ${r.mode ?? "an unknown"} mode, which identities with s3:BypassGovernanceRetention can override.`, r.line);
});

// ── Rules: access ─────────────────────────────────────────────────────────────

const notPublic = bucket((s) => {
  if (s.kind === "group") return pass("CloudWatch log groups can't be made public: every read needs IAM permissions in the account.", s.res.block.line);
  const open = s.policies.flatMap((p) => p.statements).find((x) => x.effect === "Allow" && x.principals.includes("*") && x.conditions.length === 0);
  if (open) return fail('The bucket policy has an unconditional Allow for Principal "*", so log files are public.', open.line);
  const acl = s.acls.find((a) => a.value && PUBLIC_ACLS.includes(a.value));
  if (acl) return fail(`Bucket ACL "${acl.value}" grants access to everyone.`, acl.line);
  const pab = s.publicAccessBlock;
  if (!pab) return warn("No public access block declared. AWS enables it on new buckets by default, but pin it so drift is detectable.", s.res.block.line);
  const off = PAB_FLAGS.filter((f) => pab.flags[f] !== true);
  if (off.length) return fail(`The public access block doesn't set ${off.join(", ")} to true.`, pab.line);
  return pass(`All four public access block settings are enabled${pab.account ? " at account level" : ""}, so the log bucket can't be made public.`, pab.line);
});

const denyInsecureTransport = bucket((s) => {
  if (s.kind === "group") return pass("CloudWatch Logs only exposes HTTPS endpoints.", s.res.block.line);
  for (const p of s.policies) {
    for (const st of p.statements) {
      const c = st.effect === "Deny" && st.conditions.find((c) => c.variable.toLowerCase() === "aws:securetransport");
      if (c && c.values.map((v) => v.toLowerCase()).includes("false")) return pass("The bucket policy denies requests where aws:SecureTransport is false.", st.line);
    }
  }
  const o = s.policies.find((p) => p.opaque);
  if (o) return warn(`A bucket policy is attached but couldn't be read (${o.opaque}).`, o.line);
  return fail("No bucket policy statement denies requests with aws:SecureTransport = false, so the log bucket accepts plain HTTP.", s.res.block.line);
});

// ── Rules: encryption ─────────────────────────────────────────────────────────

const encryptionAtRest = bucket((s) => {
  if (s.cmk !== undefined) return pass("Logs are encrypted at rest with a customer-managed KMS key.", s.cmk);
  if (s.kind === "group") return pass("CloudWatch Logs always encrypts log data at rest (with AWS-owned keys unless kms_key_id is set).", s.res.block.line);
  if (s.sse?.algorithm === "AES256") return pass("Default encryption uses SSE-S3 (AES-256).", s.sse.line);
  if (s.sse?.algorithm?.startsWith("aws:kms")) return pass(`Default encryption uses ${s.sse.algorithm}.`, s.sse.line);
  return warn("No server-side encryption configuration declared. S3 applies SSE-S3 by default, but declare it so drift is detectable.", s.res.block.line);
});

const customerManagedKey = bucket((s) => {
  if (s.cmk !== undefined) return pass(s.kind === "group" ? "kms_key_id encrypts this log group with a customer-managed key." : "Log files are encrypted with a customer-managed KMS key.", s.cmk);
  if (s.kind === "bucket" && s.sse?.algorithm?.startsWith("aws:kms")) return warn("SSE-KMS is on but no key is named, so the AWS-managed aws/s3 key is used.", s.sse.line);
  return fail(s.kind === "group" ? "No kms_key_id, so the log group uses AWS-owned keys." : "Log files aren't encrypted with a customer-managed key (set kms_key_id on the trail or SSE-KMS on the bucket).", s.res.block.line);
});

// ── Rules: location ───────────────────────────────────────────────────────────

const regionTrusted = bucket((s, t) => {
  const { line } = t.model.awsRegion();
  if (!s.region) return warn("The region is unknown or computed at apply time.", line ?? s.res.block.line);
  if (isTrusted(s.region, t.settings)) return pass(`Stored in ${s.region}, which is in the trusted list.`, line);
  return fail(`Stored in ${s.region}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "aws_", "AWS", (r) => t.model.regionFor(r)));

const forwardingInPerimeter = template((t) => {
  const routes: { from: string; value: HclValue | undefined; line: number }[] = [
    ...t.buckets.flatMap((b) => b.replicationDestinations.map((d) => ({ from: b.res.address, value: d.value, line: d.line }))),
    ...t.model.ofType("aws_cloudwatch_log_subscription_filter").map((f) => ({ from: f.address, value: f.block.attrs.destination_arn?.value, line: f.block.line })),
  ];
  if (!routes.length) return na("Logs aren't replicated or forwarded to another destination.");
  for (const r of routes) {
    const target = t.model.resources.find((x) => x.mode === "resource" && references(r.value, x.address));
    if (!target) return warn(`${r.from} forwards logs to a destination outside this template, so its region can't be checked.`, r.line);
    const reg = t.model.regionFor(target);
    if (!reg || !isTrusted(reg, t.settings)) return fail(`${r.from} forwards logs to ${target.address} in ${reg ?? "an unknown region"}, outside the trusted list.`, r.line);
  }
  return pass("Every log replication and subscription destination is in a trusted region.", routes[0].line);
});

// ── Rules: alerting and tamper resistance ─────────────────────────────────────

const QUERY_EVENTS = ["StartQuery", "FilterLogEvents", "GetLogEvents", "GetQueryResults"];
const TAMPER_EVENTS = ["StopLogging", "DeleteTrail", "UpdateTrail", "PutEventSelectors", "DeleteLogGroup", "PutRetentionPolicy", "DeleteFlowLogs"];

const queryAnomalyAlert = template((t) => {
  const hits = alertsOn(t, QUERY_EVENTS);
  if (!hits.length) return fail("No metric filter counts CloudWatch Logs queries (StartQuery, FilterLogEvents, GetLogEvents), so bulk reads of logs aren't alerted on.");
  const anomaly = hits.flatMap((h) => h.alarms).find((a) => a.anomaly && a.actions);
  if (anomaly) return pass(`${anomaly.res.address} alerts when log queries rise above the expected anomaly-detection band.`, anomaly.res.block.line);
  const fixed = hits.flatMap((h) => h.alarms).find((a) => a.actions);
  if (fixed) return warn(`${fixed.res.address} alerts on log queries above a fixed threshold; an anomaly-detection band adapts to normal usage.`, fixed.res.block.line);
  return fail(`${hits[0].filter.res.address} counts log queries, but no alarm with alarm_actions watches its metric.`, hits[0].filter.res.block.line);
});

const tamperAlert = template((t) => {
  const rule = t.eventRules.find((r) => r.targeted && TAMPER_EVENTS.some((e) => r.pattern.includes(e)));
  const hits = alertsOn(t, TAMPER_EVENTS);
  const alarmed = hits.find((h) => h.alarms.some((a) => a.actions));
  const covered = new Set([...(rule ? TAMPER_EVENTS.filter((e) => rule.pattern.includes(e)) : []), ...(alarmed ? alarmed.covered : [])]);
  const where = rule?.res ?? alarmed?.filter.res;
  if (!where) {
    if (hits.length) return fail(`${hits[0].filter.res.address} matches logging changes, but no alarm with alarm_actions watches its metric.`, hits[0].filter.res.block.line);
    return fail("Nothing alerts when a trail is stopped or deleted, or a log group is removed (no metric filter + alarm or EventBridge rule on StopLogging / DeleteTrail).");
  }
  const missing = ["StopLogging", "DeleteTrail"].filter((e) => !covered.has(e));
  if (missing.length) return warn(`${where.address} alerts on ${[...covered].join(", ")}, but not on ${missing.join(" or ")}.`, where.block.line);
  return pass(`${where.address} raises an alert on ${[...covered].join(", ")}.`, where.block.line);
});

const loggingCantBeDisabled = template((t) => {
  const org = t.trails.find((tr) => t.model.bool(tr.block.attrs.is_organization_trail?.value) === true);
  if (org) return pass(`${org.address} is an organisation trail: member accounts can't stop or delete it.`, org.block.attrs.is_organization_trail!.line);
  const scp = t.scps.find((p) => p.statements.some((s) => s.effect === "Deny" && s.actions.some((a) => /^cloudtrail:(StopLogging|DeleteTrail|\*)$/i.test(a))));
  if (scp) return pass(`${scp.res.address} is a service control policy that denies stopping or deleting trails.`, scp.res.block.line);
  if (!t.trails.length) return fail("No trail, so there's no audit logging to protect.");
  return fail("Anyone with cloudtrail:StopLogging in this account can switch the trail off without touching the resources it records. Use an organisation trail or an SCP that denies it.", t.trails[0].block.line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const aws: ProviderRules<LogStoreView, AwsLoggingView> = {
  id: "aws",
  label: "AWS",
  prefix: "aws_",
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
