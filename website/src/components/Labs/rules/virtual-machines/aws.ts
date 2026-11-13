/**
 * Static rules mapping Amazon EC2 Terraform (aws provider) to CCC assessment
 * requirements for CCC.VM, which currently consists of the CCC.Core controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * Rules only see what the template declares: AMI contents, software installed on
 * the instance, IAM identity policies, SCPs and account settings made elsewhere
 * are invisible. The authoritative checks are the behavioural tests in
 * modules/features.
 *
 * The instance is the primary resource. Its network exposure (public IP and
 * security groups) is the main evidence for the access controls, its EBS volumes
 * for the encryption controls, and AWS Backup / DLM for the replication control.
 */

import type { HclBlock, HclValue } from "../../hcl/parser";
import { references, subBlocks, type TfModel, type TfResource } from "../../terraform/model";
import type { Evidence, LabsSettings } from "../../types";
import { fail, first, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

// ── Shared helpers ────────────────────────────────────────────────────────────

const SEVERITY: Record<Evidence["status"], number> = { na: 0, pass: 1, manual: 2, warn: 3, fail: 4 };

/** The worst of several pieces of evidence; when all pass, their messages are joined. */
function combine(...es: Evidence[]): Evidence {
  const worst = es.reduce((a, b) => (SEVERITY[b.status] > SEVERITY[a.status] ? b : a));
  if (worst.status !== "pass") return worst;
  const passes = es.filter((e) => e.status === "pass");
  return pass(passes.map((e) => e.message).join(" "), passes[0].line);
}

function items(model: TfModel, v: HclValue | undefined): HclValue[] {
  const r = model.resolve(v);
  if (!r) return [];
  return r.t === "list" ? r.items : [r];
}

/** Reads a tags map, including `merge(var.x, { ... })`. */
function tagsOf(model: TfModel, v: HclValue | undefined): Record<string, string> {
  const r = model.resolve(v);
  if (!r) return {};
  if (r.t === "obj") {
    const out: Record<string, string> = {};
    for (const [k, e] of Object.entries(r.entries)) {
      const s = model.str(e);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  if (r.t === "call" && r.name === "merge") return Object.assign({}, ...r.args.map((a) => tagsOf(model, a)));
  return {};
}

const ADMIN_PORTS: Record<number, string> = { 22: "SSH (22)", 3389: "RDP (3389)", 5985: "WinRM (5985)", 5986: "WinRM (5986)" };
const WORLD = ["0.0.0.0/0", "::/0"];

interface Ingress {
  from: number;
  to: number;
  sources: string[];
  line: number;
  /** Address of the security group (or rule) that admits the traffic. */
  via: string;
}

const describePorts = (i: Ingress) => (i.from <= 0 && i.to >= 65535 ? "all ports" : i.from === i.to ? `port ${i.from}` : `ports ${i.from}-${i.to}`);
const adminPortsIn = (i: Ingress) =>
  Object.entries(ADMIN_PORTS)
    .filter(([p]) => Number(p) >= i.from && Number(p) <= i.to)
    .map(([, name]) => name);
const fromWorld = (i: Ingress) => i.sources.some((s) => WORLD.includes(s));

// ── Per-instance view of the template ─────────────────────────────────────────

interface Volume {
  name: string;
  encrypted?: boolean;
  kms?: HclValue;
  line: number;
}

interface KeyRef {
  /** The aws_kms_key, when it's declared in this template. */
  key?: TfResource;
  line: number;
}

export interface InstanceView {
  res: TfResource;
  region?: string;
  az?: { value?: string; line: number };
  tags: Record<string, string>;
  volumes: Volume[];
  publicIp: { value?: boolean; why: string; line: number };
  /** Security groups attached and declared in this template. */
  groups: TfResource[];
  /** Security group references that point outside this template. */
  externalGroups: number;
  ingress: Ingress[];
  imds?: { tokens?: string; endpoint?: string; hopLimit?: number; line: number };
  keyName?: string;
  /** The instance profile's role has the CloudWatch agent policy attached. */
  cloudWatchAgent?: number;
}

export interface Ec2View extends BaseView<InstanceView> {
  trails: TfResource[];
  ebsDefault?: { enabled: boolean; line: number };
  defaultKey?: { value: HclValue; line: number };
  imdsDefaults?: { tokens?: string; line: number };
}

function readIngress(model: TfModel, block: HclBlock, via: string, proto: string, ipv4: string, ipv6: string): Ingress {
  const p = model.str(block.attrs[proto]?.value);
  const all = p === "-1" || p === "all";
  const from = model.num(block.attrs.from_port?.value);
  const to = model.num(block.attrs.to_port?.value);
  return {
    from: all || from === undefined ? 0 : from,
    to: all || to === undefined ? 65535 : to,
    sources: [...model.strList(block.attrs[ipv4]?.value), ...model.strList(block.attrs[ipv6]?.value)],
    line: block.line,
    via,
  };
}

function ingressFor(model: TfModel, sg: TfResource): Ingress[] {
  const out = subBlocks(sg.block, "ingress").map((b) => readIngress(model, b, sg.address, "protocol", "cidr_blocks", "ipv6_cidr_blocks"));
  for (const r of model.ofType("aws_security_group_rule")) {
    if (model.str(r.block.attrs.type?.value) !== "ingress" || !references(r.block.attrs.security_group_id?.value, sg.address)) continue;
    out.push(readIngress(model, r.block, r.address, "protocol", "cidr_blocks", "ipv6_cidr_blocks"));
  }
  for (const r of model.ofType("aws_vpc_security_group_ingress_rule")) {
    if (!references(r.block.attrs.security_group_id?.value, sg.address)) continue;
    out.push(readIngress(model, r.block, r.address, "ip_protocol", "cidr_ipv4", "cidr_ipv6"));
  }
  return out;
}

function publicIpOf(model: TfModel, res: TfResource): InstanceView["publicIp"] {
  const b = res.block;
  const eip = model.ofType("aws_eip").find((e) => references(e.block.attrs.instance?.value, res.address));
  const assoc = model.ofType("aws_eip_association").find((e) => references(e.block.attrs.instance_id?.value, res.address));
  const e = eip ?? assoc;
  if (e) return { value: true, why: `${e.address} gives it an Elastic IP`, line: e.block.line };
  const assocAttr = b.attrs.associate_public_ip_address;
  const explicit = model.bool(assocAttr?.value);
  if (explicit !== undefined) return { value: explicit, why: `associate_public_ip_address = ${explicit}`, line: assocAttr!.line };
  const subnetAttr = b.attrs.subnet_id;
  if (!subnetAttr) return { value: true, why: "no subnet_id, so it launches into the default VPC, whose subnets assign public IPs", line: b.line };
  const subnet = model.ofType("aws_subnet").find((s) => references(subnetAttr.value, s.address));
  if (!subnet) return { value: undefined, why: "it depends on map_public_ip_on_launch of a subnet defined outside this template", line: subnetAttr.line };
  const mapPublic = model.bool(subnet.block.attrs.map_public_ip_on_launch?.value) === true;
  return { value: mapPublic, why: `${subnet.address} has map_public_ip_on_launch = ${mapPublic}`, line: subnet.block.attrs.map_public_ip_on_launch?.line ?? subnetAttr.line };
}

function cloudWatchAgentLine(model: TfModel, res: TfResource): number | undefined {
  const profile = model.ofType("aws_iam_instance_profile").find((p) => references(res.block.attrs.iam_instance_profile?.value, p.address));
  if (!profile) return undefined;
  const roleName = model.str(profile.block.attrs.role?.value);
  const role = model.ofType("aws_iam_role").find((r) => references(profile.block.attrs.role?.value, r.address) || (roleName !== undefined && model.str(r.block.attrs.name?.value) === roleName));
  const attached = model.ofType("aws_iam_role_policy_attachment").find((a) => {
    const onRole = role ? references(a.block.attrs.role?.value, role.address) : false;
    const byName = roleName !== undefined && model.str(a.block.attrs.role?.value) === roleName;
    return (onRole || byName) && /CloudWatchAgentServerPolicy/.test(model.str(a.block.attrs.policy_arn?.value) ?? "");
  });
  return attached?.block.line;
}

export function buildEc2View(model: TfModel, settings: LabsSettings): Ec2View {
  const buckets = model.ofType("aws_instance").map((res): InstanceView => {
    const b = res.block;
    const volumes: Volume[] = [];
    const root = first(subBlocks(b, "root_block_device"));
    volumes.push(
      root
        ? { name: "root volume", encrypted: model.bool(root.attrs.encrypted?.value), kms: root.attrs.kms_key_id?.value, line: root.attrs.encrypted?.line ?? root.line }
        : { name: "root volume", line: b.line },
    );
    for (const d of subBlocks(b, "ebs_block_device")) {
      volumes.push({ name: `volume ${model.str(d.attrs.device_name?.value) ?? ""}`.trim(), encrypted: model.bool(d.attrs.encrypted?.value), kms: d.attrs.kms_key_id?.value, line: d.attrs.encrypted?.line ?? d.line });
    }
    for (const a of model.ofType("aws_volume_attachment")) {
      if (!references(a.block.attrs.instance_id?.value, res.address)) continue;
      const vol = model.ofType("aws_ebs_volume").find((v) => references(a.block.attrs.volume_id?.value, v.address));
      if (vol) {
        volumes.push({ name: vol.address, encrypted: model.bool(vol.block.attrs.encrypted?.value), kms: vol.block.attrs.kms_key_id?.value, line: vol.block.attrs.encrypted?.line ?? vol.block.line });
      }
    }

    const groupRefs = [...items(model, b.attrs.vpc_security_group_ids?.value), ...items(model, b.attrs.security_groups?.value)];
    const groups = model.ofType("aws_security_group").filter((sg) => groupRefs.some((v) => references(v, sg.address)));
    const meta = first(subBlocks(b, "metadata_options"));
    const az = b.attrs.availability_zone;

    return {
      res,
      region: model.regionFor(res),
      az: az ? { value: model.str(az.value), line: az.line } : undefined,
      tags: tagsOf(model, b.attrs.tags?.value),
      volumes,
      publicIp: publicIpOf(model, res),
      groups,
      externalGroups: groupRefs.length - groupRefs.filter((v) => groups.some((sg) => references(v, sg.address))).length,
      ingress: groups.flatMap((sg) => ingressFor(model, sg)),
      imds: meta
        ? {
            tokens: model.str(meta.attrs.http_tokens?.value),
            endpoint: model.str(meta.attrs.http_endpoint?.value),
            hopLimit: model.num(meta.attrs.http_put_response_hop_limit?.value),
            line: meta.attrs.http_tokens?.line ?? meta.line,
          }
        : undefined,
      keyName: b.attrs.key_name ? (model.str(b.attrs.key_name.value) ?? "a key pair") : undefined,
      cloudWatchAgent: cloudWatchAgentLine(model, res),
    };
  });

  const ebs = first(model.ofType("aws_ebs_encryption_by_default"));
  const defKey = first(model.ofType("aws_ebs_default_kms_key"));
  const imdsDefaults = first(model.ofType("aws_ec2_instance_metadata_defaults"));

  return {
    model,
    buckets,
    settings,
    trails: model.ofType("aws_cloudtrail"),
    ebsDefault: ebs ? { enabled: model.bool(ebs.block.attrs.enabled?.value) !== false, line: ebs.block.line } : undefined,
    defaultKey: defKey?.block.attrs.key_arn ? { value: defKey.block.attrs.key_arn.value, line: defKey.block.line } : undefined,
    imdsDefaults: imdsDefaults ? { tokens: model.str(imdsDefaults.block.attrs.http_tokens?.value), line: imdsDefaults.block.line } : undefined,
  };
}

// ── Key helpers ───────────────────────────────────────────────────────────────

function resolveKey(model: TfModel, v: HclValue, line: number): KeyRef {
  const key = model.ofType("aws_kms_key").find((k) => references(v, k.address));
  if (key) return { key, line };
  const alias = model.ofType("aws_kms_alias").find((a) => references(v, a.address));
  const target = alias && model.ofType("aws_kms_key").find((k) => references(alias.block.attrs.target_key_id?.value, k.address));
  return { key: target, line };
}

const encryptedByDefault = (t: Ec2View) => t.ebsDefault?.enabled === true;

/** The customer-managed key each volume uses, or undefined when it uses aws/ebs or isn't encrypted. */
function volumeKeys(i: InstanceView, t: Ec2View): { volume: Volume; key?: KeyRef }[] {
  return i.volumes.map((v) => {
    const encrypted = v.encrypted === true || encryptedByDefault(t);
    if (encrypted && v.kms) return { volume: v, key: resolveKey(t.model, v.kms, v.line) };
    if (encrypted && encryptedByDefault(t) && t.defaultKey) return { volume: v, key: resolveKey(t.model, t.defaultKey.value, t.defaultKey.line) };
    return { volume: v };
  });
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<InstanceView, Ec2View>();

// Encryption at rest ----------------------------------------------------------

const encryptionAtRest = bucket((i, t) => {
  const plain = i.volumes.filter((v) => v.encrypted !== true);
  if (!plain.length) {
    const what = i.volumes.length === 1 ? `The ${i.volumes[0].name} sets` : `All ${i.volumes.length} EBS volumes set`;
    return pass(`${what} encrypted = true (AES-256).`, i.volumes[0].line);
  }
  if (encryptedByDefault(t)) return pass("EBS encryption by default is enabled for this account and region, so every new volume is encrypted (AES-256).", t.ebsDefault!.line);
  const v = plain[0];
  if (v.encrypted === false) return fail(`The ${v.name} sets encrypted = false.`, v.line);
  return fail(`The ${v.name} doesn't set encrypted = true and EBS encryption by default isn't enabled, so it's only encrypted if the AMI's snapshot is.`, v.line);
});

const customerManagedKeys = bucket((i, t) => {
  const keys = volumeKeys(i, t);
  const missing = keys.find((k) => !k.key);
  if (missing) {
    const encrypted = missing.volume.encrypted === true || encryptedByDefault(t);
    if (!encrypted) return fail(`The ${missing.volume.name} isn't encrypted, so no customer-managed key protects it.`, missing.volume.line);
    return fail(`The ${missing.volume.name} is encrypted with the AWS-managed aws/ebs key. Set kms_key_id to a customer-managed KMS key.`, missing.volume.line);
  }
  const k = keys[0].key!;
  return pass(`All EBS volumes are encrypted with a customer-managed KMS key (${k.key?.address ?? "defined outside this template"}).`, k.line);
});

/** The distinct customer-managed keys the instance's volumes use. */
function keysInUse(i: InstanceView, t: Ec2View): KeyRef[] {
  const out: KeyRef[] = [];
  for (const { key } of volumeKeys(i, t)) if (key && !out.some((o) => (o.key && o.key === key.key) || (!o.key && !key.key))) out.push(key);
  return out;
}

const keyAlgorithm = bucket((i, t) => {
  const keys = keysInUse(i, t);
  if (!keys.length) return na("No customer-managed key encrypts this instance's volumes (see CCC.Core.CN11.AR03).");
  const external = keys.find((k) => !k.key);
  if (external) return warn("The KMS key is defined outside this template, so its key spec can't be checked.", external.line);
  for (const k of keys) {
    const spec = t.model.str(k.key!.block.attrs.customer_master_key_spec?.value) ?? "SYMMETRIC_DEFAULT";
    if (spec !== "SYMMETRIC_DEFAULT") return warn(`${k.key!.address} uses ${spec}; EBS needs a SYMMETRIC_DEFAULT (AES-256-GCM) key.`, k.key!.block.attrs.customer_master_key_spec?.line ?? k.key!.block.line);
  }
  return pass(`${keys.map((k) => k.key!.address).join(", ")} use${keys.length === 1 ? "s" : ""} SYMMETRIC_DEFAULT (AES-256-GCM).`, keys[0].key!.block.line);
});

function keyRotation(maxDays: number) {
  return bucket((i, t) => {
    const keys = keysInUse(i, t);
    if (!keys.length) return na("No customer-managed key encrypts this instance's volumes (see CCC.Core.CN11.AR03).");
    const external = keys.find((k) => !k.key);
    if (external) return warn("The KMS key is defined outside this template, so its rotation can't be checked.", external.line);
    for (const { key } of keys) {
      const a = key!.block.attrs;
      if (t.model.bool(a.enable_key_rotation?.value) !== true) {
        return fail(`${key!.address} doesn't set enable_key_rotation = true, so the key is never rotated (limit: ${maxDays} days).`, a.enable_key_rotation?.line ?? key!.block.line);
      }
      const days = t.model.num(a.rotation_period_in_days?.value) ?? 365;
      if (days > maxDays) return fail(`${key!.address} rotates every ${days} days, above the ${maxDays}-day limit. Set rotation_period_in_days.`, a.rotation_period_in_days?.line ?? a.enable_key_rotation!.line);
    }
    const k = keys[0].key!;
    const days = t.model.num(k.block.attrs.rotation_period_in_days?.value) ?? 365;
    return pass(`${k.address} rotates automatically every ${days} days (limit: ${maxDays}).`, k.block.attrs.rotation_period_in_days?.line ?? k.block.attrs.enable_key_rotation!.line);
  });
}

// Access ----------------------------------------------------------------------

function groupsUnknown(i: InstanceView): Evidence | undefined {
  if (i.externalGroups) return warn("A security group attached to this instance is defined outside this template, so its rules can't be checked.", i.res.block.attrs.vpc_security_group_ids?.line ?? i.res.block.line);
  return undefined;
}

/** CN05.AR01/AR02: administrative access (SSH, RDP, WinRM) is only possible from inside the trust perimeter. */
function adminAccess(i: InstanceView): Evidence {
  const open = i.ingress.find((x) => fromWorld(x) && adminPortsIn(x).length);
  if (open) {
    const what = `${open.via} allows ${adminPortsIn(open).join(", ")} from ${open.sources.filter((s) => WORLD.includes(s)).join(", ")}`;
    if (i.publicIp.value === false) return warn(`${what}. The instance has no public IP, so it isn't directly reachable from the internet, but narrow the rule.`, open.line);
    return fail(`${what}, and the instance ${i.publicIp.value ? "has a public IP" : "may get a public IP"}, so anyone on the internet can attempt to log in.`, open.line);
  }
  const unknown = groupsUnknown(i);
  if (unknown) return unknown;
  const admin = i.ingress.filter((x) => adminPortsIn(x).length);
  if (!i.groups.length) return pass("No security group is attached, so the VPC's default group applies: it only admits traffic from members of the same group.", i.res.block.line);
  if (!admin.length) return pass("No security group rule opens SSH, RDP or WinRM, so the instance can't be administered over the network (use Session Manager instead).", i.groups[0].block.line);
  const sources = [...new Set(admin.flatMap((x) => x.sources))];
  return pass(`Administrative ports only accept connections from ${sources.join(", ") || "other security groups"}.`, admin[0].line);
}

const adminAccessRestricted = bucket(adminAccess);

/** CN05.AR04/AR05/AR06: the instance isn't reachable from outside the trust perimeter. */
const notInternetReachable = bucket((i) => {
  const world = i.ingress.find(fromWorld);
  const ip = i.publicIp;
  if (ip.value === true && world) return fail(`The instance has a public IP (${ip.why}) and ${world.via} allows ${describePorts(world)} from the internet.`, world.line);
  const unknown = groupsUnknown(i);
  if (unknown) return unknown;
  if (ip.value === true) return warn(`The instance has a public IP (${ip.why}); no security group rule admits the internet, but it's still addressable from outside the network.`, ip.line);
  if (ip.value === undefined) {
    return warn(`Whether the instance gets a public IP is unknown (${ip.why}). Set associate_public_ip_address = false.`, ip.line);
  }
  if (world) return warn(`No public IP, but ${world.via} allows ${describePorts(world)} from 0.0.0.0/0; anything routed into the VPC can reach it.`, world.line);
  return pass(`Not reachable from the internet: no public IP (${ip.why}) and no security group rule admits 0.0.0.0/0.`, ip.line);
});

/** CN03.AR02/AR04: logins need a credential and originate inside the trust perimeter. */
function login(i: InstanceView): Evidence {
  const credential = i.keyName
    ? pass(`Logins need the private key of the ${i.keyName} key pair (EC2 Linux images don't accept passwords).`, i.res.block.attrs.key_name!.line)
    : pass("No key pair is set, so logins go through IAM-authenticated Session Manager or EC2 Instance Connect.", i.res.block.line);
  return combine(credential, adminAccess(i));
}

/** IMDSv2: the instance metadata API only answers requests carrying a session token, from the instance itself. */
function metadataToken(i: InstanceView, t: Ec2View): Evidence {
  const m = i.imds;
  if (m?.endpoint === "disabled") return pass("The instance metadata endpoint is disabled.", m.line);
  if (m?.tokens === "required") {
    const hops = m.hopLimit ?? 1;
    const note = hops > 1 ? ` The response hop limit is ${hops}, so containers on the instance can reach it too.` : "";
    return pass(`IMDSv2 is required: the metadata API only answers requests with a session token, which can't be obtained from outside the instance.${note}`, m.line);
  }
  if (m?.tokens === "optional") return fail('metadata_options.http_tokens = "optional", so the metadata API answers IMDSv1 requests without a token (SSRF can steal instance credentials).', m.line);
  if (t.imdsDefaults?.tokens === "required") return pass("The account-level metadata default requires IMDSv2 for new instances.", t.imdsDefaults.line);
  return warn('metadata_options.http_tokens isn\'t set to "required". Newer AMIs require IMDSv2, but older ones still accept token-less IMDSv1 requests; pin it.', m?.line ?? i.res.block.line);
}

const loginCredential = bucket(login);
const apiAccessCredential = bucket((i, t) => combine(login(i), metadataToken(i, t)));

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template((t) => {
  if (!t.trails.length) return fail("No aws_cloudtrail resource. EC2 management events (start, stop, modify) are only kept for 90 days in Event History without a trail.");
  const tr = t.trails[0];
  if (t.model.bool(tr.block.attrs.enable_logging?.value) === false) return fail("CloudTrail is declared with enable_logging = false.", tr.block.attrs.enable_logging?.line);
  const selectors = subBlocks(tr.block, "event_selector");
  if (selectors.length && selectors.every((s) => t.model.bool(s.attrs.include_management_events?.value) === false)) {
    return fail("CloudTrail event selectors exclude management events.", selectors[0].line);
  }
  return pass(`${tr.address} records EC2 management events (who changed which instance, when, and the result).`, tr.block.line);
});

const logsSeparatedFromResource = bucket((i, t) => {
  if (i.cloudWatchAgent) {
    return pass("The instance role has CloudWatchAgentServerPolicy, so the CloudWatch agent can ship OS and login logs to CloudWatch Logs, off the instance.", i.cloudWatchAgent);
  }
  if (t.trails.length) {
    return warn(`${t.trails[0].address} keeps API activity off the instance, but its OS and login logs stay on its own disk (no CloudWatch agent role).`, i.res.block.attrs.iam_instance_profile?.line ?? i.res.block.line);
  }
  return fail("Nothing ships logs off the instance (no CloudTrail, no CloudWatch agent role), so its OS and login logs live only on its own disk, where anyone with root can alter them.", i.res.block.line);
});

// Data protection -------------------------------------------------------------

/** True when a backup selection or DLM target selects this instance by reference, wildcard ARN or tag. */
function selectsInstance(i: InstanceView, t: Ec2View, sel: HclBlock): boolean {
  const m = t.model;
  const byResource = items(m, sel.attrs.resources?.value).some((v) => {
    const s = m.str(v) ?? "";
    return references(v, i.res.address) || s === "*" || /^arn:aws:ec2:[^:]*:[^:]*:instance\/\*$/.test(s);
  });
  const byTag = subBlocks(sel, "selection_tag").some((s) => {
    const k = m.str(s.attrs.key?.value);
    return k !== undefined && i.tags[k] !== undefined && i.tags[k] === m.str(s.attrs.value?.value);
  });
  const byCondition = subBlocks(sel, "condition")
    .flatMap((c) => subBlocks(c, "string_equals"))
    .some((s) => {
      const k = (m.str(s.attrs.key?.value) ?? "").replace(/^aws:ResourceTag\//, "");
      return i.tags[k] !== undefined && i.tags[k] === m.str(s.attrs.value?.value);
    });
  return byResource || byTag || byCondition;
}

const recoverableCopy = bucket((i, t) => {
  const m = t.model;
  for (const sel of m.ofType("aws_backup_selection")) {
    if (!selectsInstance(i, t, sel.block)) continue;
    const plan = m.ofType("aws_backup_plan").find((p) => references(sel.block.attrs.plan_id?.value, p.address));
    const copy = plan && subBlocks(plan.block, "rule").flatMap((r) => subBlocks(r, "copy_action"))[0];
    if (copy) {
      const vault = m.ofType("aws_backup_vault").find((v) => references(copy.attrs.destination_vault_arn?.value, v.address));
      const region = vault ? m.regionFor(vault) : undefined;
      return pass(`${plan!.address} backs this instance up and copies each recovery point to ${vault?.address ?? "another vault"}${region ? ` in ${region}` : ""}.`, copy.line);
    }
    return pass(`${plan?.address ?? sel.address} takes scheduled backups of this instance; EBS snapshots are stored in Amazon S3 across several Availability Zones (separate data centres).`, sel.block.line);
  }
  for (const dlm of m.ofType("aws_dlm_lifecycle_policy")) {
    const details = first(subBlocks(dlm.block, "policy_details"));
    if (!details) continue;
    const target = m.resolve(details.attrs.target_tags?.value);
    const wanted = target?.t === "obj" ? Object.entries(target.entries).map(([k, v]) => [k, m.str(v)] as const) : [];
    if (!wanted.length || !wanted.every(([k, v]) => i.tags[k] === v)) continue;
    const xr = subBlocks(details, "schedule").flatMap((s) => subBlocks(s, "cross_region_copy_rule"))[0];
    if (xr) return pass(`${dlm.address} snapshots this instance and copies the snapshots to ${m.str(xr.attrs.target?.value) ?? m.str(xr.attrs.target_region?.value) ?? "another region"}.`, xr.line);
    return pass(`${dlm.address} snapshots this instance on a schedule; snapshots are stored in Amazon S3 across several Availability Zones.`, dlm.block.line);
  }
  return fail("No AWS Backup plan or Data Lifecycle Manager policy covers this instance, so its EBS volumes have no recoverable copy outside the Availability Zone they live in.", i.res.block.line);
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((i, t) => {
  const { line } = t.model.awsRegion();
  const where = line ?? i.res.block.line;
  if (!i.region) return warn("The region is unknown or computed at apply time (e.g. from an environment variable).", where);
  if (!isTrusted(i.region, t.settings)) return fail(`Deployed to ${i.region}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, where);
  if (i.az?.value && !i.az.value.startsWith(i.region)) return warn(`availability_zone ${i.az.value} isn't in ${i.region}.`, i.az.line);
  return pass(`Deployed to ${i.az?.value ?? i.region}, which is in the trusted list.`, i.az?.line ?? where);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "aws_", "AWS", (r) => t.model.regionFor(r)));

// ── Registry ──────────────────────────────────────────────────────────────────

export const aws: ProviderRules<InstanceView, Ec2View> = {
  id: "aws",
  label: "AWS",
  prefix: "aws_",
  noun: { one: "instance", many: "instances" },
  build: buildEc2View,
  rules: {
    "CCC.Core.CN02.AR01": encryptionAtRest,
    // CN03.AR01/AR03 (MFA for the console) aren't expressed in instance Terraform: live test only.
    "CCC.Core.CN03.AR02": loginCredential,
    "CCC.Core.CN03.AR04": apiAccessCredential,
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN05.AR01": adminAccessRestricted,
    "CCC.Core.CN05.AR02": adminAccessRestricted,
    "CCC.Core.CN05.AR04": notInternetReachable,
    "CCC.Core.CN05.AR05": notInternetReachable,
    "CCC.Core.CN05.AR06": notInternetReachable,
    "CCC.Core.CN06.AR01": regionTrusted,
    "CCC.Core.CN06.AR02": childRegionsTrusted,
    "CCC.Core.CN08.AR01": recoverableCopy,
    "CCC.Core.CN09.AR01": logsSeparatedFromResource,
    "CCC.Core.CN11.AR01": keyAlgorithm,
    "CCC.Core.CN11.AR02": keyRotation(180),
    "CCC.Core.CN11.AR03": customerManagedKeys,
    "CCC.Core.CN11.AR05": keyRotation(365),
    "CCC.Core.CN11.AR06": keyRotation(90),
  },
};
