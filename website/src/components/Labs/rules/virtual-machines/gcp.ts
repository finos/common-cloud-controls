/**
 * Static rules mapping Compute Engine Terraform (google provider) to CCC
 * assessment requirements for CCC.VM, which currently consists of the CCC.Core
 * controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * Rules only see what the template declares: organisation policies, firewall
 * rules and IAM granted outside the template, and software inside the image are
 * invisible. The authoritative checks are the behavioural tests in modules/features.
 *
 * google_compute_instance is the primary resource. Network exposure comes from
 * access_config (external IPs) and the VPC firewall rules that target the
 * instance; disk encryption from boot/attached disk keys; replication from
 * snapshot schedules.
 */

import type { HclBlock, HclValue } from "../../hcl/parser";
import { references, subBlocks, type TfModel, type TfResource } from "../../terraform/model";
import type { Evidence, LabsSettings } from "../../types";
import { fail, first, gcpLocation, isTrusted, locationsTrusted, pass, ruleFactories, warn, na, type BaseView, type ProviderRules } from "../common";

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

/** Reads a string map such as `metadata` or `labels`, including `merge(var.x, { ... })`. */
function mapOf(model: TfModel, v: HclValue | undefined): Record<string, string> {
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
  if (r.t === "call" && r.name === "merge") return Object.assign({}, ...r.args.map((a) => mapOf(model, a)));
  return {};
}

const ADMIN_PORTS: Record<number, string> = { 22: "SSH (22)", 3389: "RDP (3389)", 5985: "WinRM (5985)", 5986: "WinRM (5986)" };
const WORLD = ["0.0.0.0/0", "::/0"];

interface Ingress {
  ranges: [number, number][];
  sources: string[];
  line: number;
  via: string;
}

const fromWorld = (i: Ingress) => i.sources.some((s) => WORLD.includes(s));
const adminPortsIn = (i: Ingress) =>
  Object.entries(ADMIN_PORTS)
    .filter(([p]) => i.ranges.some(([a, b]) => Number(p) >= a && Number(p) <= b))
    .map(([, name]) => name);
const describePorts = (i: Ingress) =>
  i.ranges.map(([a, b]) => (a <= 0 && b >= 65535 ? "all ports" : a === b ? `port ${a}` : `ports ${a}-${b}`)).join(", ");

function parsePortRange(s: string): [number, number] {
  const [a, b] = s.split("-").map((x) => Number(x.trim()));
  if (Number.isNaN(a)) return [0, 65535];
  return [a, b === undefined || Number.isNaN(b) ? a : b];
}

const isTrue = (s: string | undefined) => (s ?? "").toLowerCase() === "true";

// ── Network matching ──────────────────────────────────────────────────────────

/** A comparable key for a network: the google_compute_network address, its literal name, or undefined when unknown. */
function networkKey(model: TfModel, v: HclValue | undefined): string | undefined {
  if (!v) return undefined;
  const net = model.ofType("google_compute_network").find((n) => references(v, n.address));
  if (net) return net.address;
  const s = model.str(v);
  return s ? s.split("/").pop() : undefined;
}

function nicNetworkKey(model: TfModel, nic: HclBlock): string | undefined {
  if (nic.attrs.network) return networkKey(model, nic.attrs.network.value);
  if (nic.attrs.subnetwork) {
    const sub = model.ofType("google_compute_subnetwork").find((s) => references(nic.attrs.subnetwork!.value, s.address));
    return sub ? networkKey(model, sub.block.attrs.network?.value) : undefined;
  }
  return "default";
}

/** The rules GCP pre-populates in the auto-created "default" network. */
const DEFAULT_NETWORK_RULES: { name: string; port?: number; source: string }[] = [
  { name: "default-allow-ssh", port: 22, source: "0.0.0.0/0" },
  { name: "default-allow-rdp", port: 3389, source: "0.0.0.0/0" },
  { name: "default-allow-internal", source: "10.128.0.0/9" },
];

function firewallIngress(model: TfModel, fw: TfResource): Ingress | undefined {
  const a = fw.block.attrs;
  if ((model.str(a.direction?.value) ?? "INGRESS").toUpperCase() !== "INGRESS" || model.bool(a.disabled?.value) === true) return undefined;
  const ranges: [number, number][] = [];
  for (const allow of subBlocks(fw.block, "allow")) {
    const proto = (model.str(allow.attrs.protocol?.value) ?? "").toLowerCase();
    if (proto === "icmp") continue;
    const ports = model.strList(allow.attrs.ports?.value);
    if (proto === "all" || !ports.length) ranges.push([0, 65535]);
    else ranges.push(...ports.map(parsePortRange));
  }
  if (!ranges.length) return undefined;
  let sources = [...model.strList(a.source_ranges?.value)];
  const tagged = model.strList(a.source_tags?.value).length || model.strList(a.source_service_accounts?.value).length;
  if (!sources.length && !tagged) sources = ["0.0.0.0/0"]; // GCP's default when no source is given
  if (!sources.length) sources = ["tagged instances"];
  return { ranges, sources, line: fw.block.line, via: fw.address };
}

// ── Per-instance view of the template ─────────────────────────────────────────

interface Disk {
  name: string;
  kms?: HclValue;
  csek: boolean;
  line: number;
  /** The google_compute_disk backing it, when declared in this template. */
  source?: TfResource;
}

interface Located<T> {
  value: T;
  line: number;
}

export interface GceView {
  res: TfResource;
  zone?: Located<string | undefined>;
  disks: Disk[];
  bootPolicies: HclValue[];
  publicIp?: number;
  networks: (string | undefined)[];
  ingress: Ingress[];
  osLogin?: Located<boolean>;
  opsAgent?: { how: string; line: number };
}

export interface GceTemplateView extends BaseView<GceView> {
  projectOsLogin?: Located<boolean>;
  orgOsLogin?: number;
}

function diskFrom(model: TfModel, name: string, b: HclBlock): Disk {
  const source = model.ofType("google_compute_disk").find((d) => references(b.attrs.source?.value, d.address));
  const enc = source && first(subBlocks(source.block, "disk_encryption_key"));
  const kms = b.attrs.kms_key_self_link?.value ?? enc?.attrs.kms_key_self_link?.value;
  return {
    name,
    kms,
    csek: !!(b.attrs.disk_encryption_key_raw || enc?.attrs.raw_key || enc?.attrs.rsa_encrypted_key),
    line: b.attrs.kms_key_self_link?.line ?? enc?.line ?? b.line,
    source,
  };
}

export function buildGceView(model: TfModel, settings: LabsSettings): GceTemplateView {
  const firewalls = model.ofType("google_compute_firewall");
  const declaresDefault = model.ofType("google_compute_network").some((n) => model.str(n.block.attrs.name?.value) === "default");

  const buckets = model.ofType("google_compute_instance").map((res): GceView => {
    const b = res.block;
    const boot = first(subBlocks(b, "boot_disk"));
    const disks: Disk[] = [];
    if (boot) disks.push(diskFrom(model, "boot disk", boot));
    subBlocks(b, "attached_disk").forEach((d, n) => disks.push(diskFrom(model, `attached disk ${n + 1}`, d)));
    const init = boot && first(subBlocks(boot, "initialize_params"));
    const bootPolicies = [...items(model, init?.attrs.resource_policies?.value), ...disks.flatMap((d) => items(model, d.source?.block.attrs.resource_policies?.value))];

    const nics = subBlocks(b, "network_interface");
    const access = nics.flatMap((n) => [...subBlocks(n, "access_config"), ...subBlocks(n, "ipv6_access_config")])[0];
    const networks = nics.map((n) => nicNetworkKey(model, n));
    const tags = model.strList(b.attrs.tags?.value);

    const ingress: Ingress[] = [];
    for (const fw of firewalls) {
      const fwNet = networkKey(model, fw.block.attrs.network?.value);
      if (!networks.some((n) => n === undefined || fwNet === undefined || n === fwNet)) continue;
      const targets = model.strList(fw.block.attrs.target_tags?.value);
      if (targets.length && !targets.some((t) => tags.includes(t))) continue;
      const x = firewallIngress(model, fw);
      if (x) ingress.push(x);
    }
    if (networks.includes("default") && !declaresDefault) {
      const nic = nics.find((n) => nicNetworkKey(model, n) === "default");
      for (const r of DEFAULT_NETWORK_RULES) {
        ingress.push({ ranges: [r.port ? [r.port, r.port] : [0, 65535]], sources: [r.source], line: nic?.line ?? b.line, via: `the default network's pre-populated "${r.name}" rule` });
      }
    }

    const metadata = mapOf(model, b.attrs.metadata?.value);
    const labels = mapOf(model, b.attrs.labels?.value);
    const startup = (model.str(b.attrs.metadata_startup_script?.value) ?? "") + (metadata["startup-script"] ?? "");
    let opsAgent: GceView["opsAgent"];
    if (/google-cloud-ops-agent/.test(startup)) opsAgent = { how: "the startup script installs the Ops Agent", line: (b.attrs.metadata_startup_script ?? b.attrs.metadata)!.line };
    else if (labels["goog-ops-agent-policy"]) opsAgent = { how: "an Ops Agent policy manages the agent (goog-ops-agent-policy label)", line: b.attrs.labels!.line };
    else if (isTrue(metadata["google-logging-enabled"])) opsAgent = { how: "google-logging-enabled = true turns on the built-in logging agent", line: b.attrs.metadata!.line };
    else {
      const policy = first(model.ofType("google_os_config_os_policy_assignment"));
      if (policy) opsAgent = { how: `${policy.address} manages agents through VM Manager`, line: policy.block.line };
    }

    return {
      res,
      zone: b.attrs.zone ? { value: model.str(b.attrs.zone.value), line: b.attrs.zone.line } : undefined,
      disks,
      bootPolicies,
      publicIp: access?.line,
      networks,
      ingress,
      osLogin: metadata["enable-oslogin"] !== undefined ? { value: isTrue(metadata["enable-oslogin"]), line: b.attrs.metadata!.line } : undefined,
      opsAgent,
    };
  });

  let projectOsLogin: GceTemplateView["projectOsLogin"];
  for (const p of model.ofType("google_compute_project_metadata")) {
    const m = mapOf(model, p.block.attrs.metadata?.value);
    if (m["enable-oslogin"] !== undefined) projectOsLogin = { value: isTrue(m["enable-oslogin"]), line: p.block.line };
  }
  for (const p of model.ofType("google_compute_project_metadata_item")) {
    if (model.str(p.block.attrs.key?.value) === "enable-oslogin") projectOsLogin = { value: isTrue(model.str(p.block.attrs.value?.value)), line: p.block.line };
  }

  const orgOsLogin =
    model.ofType("google_org_policy_policy").find((p) => /compute\.requireOsLogin$/.test(model.str(p.block.attrs.name?.value) ?? ""))?.block.line ??
    ["google_project_organization_policy", "google_folder_organization_policy", "google_organization_policy"]
      .flatMap((t) => model.ofType(t))
      .find((p) => /compute\.requireOsLogin$/.test(model.str(p.block.attrs.constraint?.value) ?? ""))?.block.line;

  return { model, buckets, settings, projectOsLogin, orgOsLogin };
}

// ── Key helpers ───────────────────────────────────────────────────────────────

interface KeyRef {
  key?: TfResource;
  line: number;
}

function keysInUse(v: GceView, t: GceTemplateView): KeyRef[] {
  const out: KeyRef[] = [];
  for (const d of v.disks) {
    if (!d.kms) continue;
    const key = t.model.ofType("google_kms_crypto_key").find((k) => references(d.kms, k.address));
    if (!out.some((o) => o.key === key)) out.push({ key, line: d.line });
  }
  return out;
}

const seconds = (s: string | undefined) => {
  const m = s && /^(\d+(?:\.\d+)?)s$/.exec(s.trim());
  return m ? Number(m[1]) : undefined;
};

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<GceView, GceTemplateView>();

// Encryption at rest ----------------------------------------------------------

const encryptionAtRest = bucket((v) => {
  const cmek = v.disks.find((d) => d.kms);
  if (cmek) return pass("Persistent disks are encrypted at rest with a customer-managed Cloud KMS key (CMEK).", cmek.line);
  return pass("Compute Engine always encrypts persistent disks at rest (AES-256, with Google-managed keys unless a CMEK is set); it can't be turned off.", v.disks[0]?.line ?? v.res.block.line);
});

const customerManagedKeys = bucket((v) => {
  if (!v.disks.length) return warn("No boot_disk block found, so the disk keys can't be checked.", v.res.block.line);
  const plain = v.disks.find((d) => !d.kms && !d.csek);
  if (plain) return fail(`The ${plain.name} uses a Google-managed key. Set kms_key_self_link to a Cloud KMS key you manage.`, plain.line);
  const csek = v.disks.find((d) => !d.kms);
  if (csek) return warn(`The ${csek.name} uses a customer-supplied key (CSEK). You hold the key, but Cloud KMS doesn't manage its lifecycle; prefer kms_key_self_link.`, csek.line);
  const what = v.disks.length === 1 ? `The ${v.disks[0].name} is` : `All ${v.disks.length} disks are`;
  return pass(`${what} encrypted with a customer-managed Cloud KMS key.`, v.disks[0].line);
});

const keyAlgorithm = bucket((v, t) => {
  const keys = keysInUse(v, t);
  if (!keys.length) return na("No customer-managed key encrypts this instance's disks (see CCC.Core.CN11.AR03).");
  const external = keys.find((k) => !k.key);
  if (external) return warn("The Cloud KMS key is defined outside this template, so its algorithm can't be checked.", external.line);
  for (const { key } of keys) {
    const tpl = first(subBlocks(key!.block, "version_template"));
    const alg = t.model.str(tpl?.attrs.algorithm?.value) ?? "GOOGLE_SYMMETRIC_ENCRYPTION";
    if (alg !== "GOOGLE_SYMMETRIC_ENCRYPTION") return warn(`${key!.address} uses ${alg}; disk encryption needs GOOGLE_SYMMETRIC_ENCRYPTION (AES-256-GCM).`, tpl?.line ?? key!.block.line);
  }
  const k = keys[0].key!;
  return pass(`${k.address} uses GOOGLE_SYMMETRIC_ENCRYPTION (AES-256-GCM).`, first(subBlocks(k.block, "version_template"))?.line ?? k.block.line);
});

function keyRotation(maxDays: number) {
  return bucket((v, t) => {
    const keys = keysInUse(v, t);
    if (!keys.length) return na("No customer-managed key encrypts this instance's disks (see CCC.Core.CN11.AR03).");
    const external = keys.find((k) => !k.key);
    if (external) return warn("The Cloud KMS key is defined outside this template, so its rotation can't be checked.", external.line);
    for (const { key } of keys) {
      const a = key!.block.attrs.rotation_period;
      if (!a) return fail(`${key!.address} has no rotation_period, so the key is never rotated (limit: ${maxDays} days).`, key!.block.line);
      const s = seconds(t.model.str(a.value));
      if (s === undefined) return warn(`${key!.address}'s rotation_period couldn't be read.`, a.line);
      const days = Math.round((s / 86400) * 10) / 10;
      if (days > maxDays) return fail(`${key!.address} rotates every ${days} days, above the ${maxDays}-day limit.`, a.line);
    }
    const k = keys[0].key!;
    const days = Math.round((seconds(t.model.str(k.block.attrs.rotation_period!.value))! / 86400) * 10) / 10;
    return pass(`${k.address} rotates automatically every ${days} days (limit: ${maxDays}).`, k.block.attrs.rotation_period!.line);
  });
}

// Access ----------------------------------------------------------------------

function unknownNetwork(v: GceView): Evidence | undefined {
  if (v.networks.some((n) => n === undefined)) {
    return warn("The instance's network is defined outside this template, so firewall rules that apply to it may be missing here.", first(subBlocks(v.res.block, "network_interface"))?.line ?? v.res.block.line);
  }
  return undefined;
}

/** CN05.AR01/AR02: administrative access (SSH, RDP, WinRM) is only possible from inside the trust perimeter. */
function adminAccess(v: GceView): Evidence {
  const open = v.ingress.find((x) => fromWorld(x) && adminPortsIn(x).length);
  if (open) {
    const via = open.via.replace(/^the /, "The ");
    const what = `${via} allows ${adminPortsIn(open).join(", ")} from 0.0.0.0/0`;
    if (!v.publicIp) return warn(`${what}. The instance has no external IP, so it isn't directly reachable from the internet, but narrow the rule.`, open.line);
    return fail(`${what}, and the instance has an external IP, so anyone on the internet can attempt to log in.`, open.line);
  }
  const admin = v.ingress.filter((x) => adminPortsIn(x).length);
  if (!admin.length) {
    return unknownNetwork(v) ?? pass("No firewall rule allows SSH, RDP or WinRM to this instance, so the VPC's implied deny blocks administrative access.", v.res.block.line);
  }
  const sources = [...new Set(admin.flatMap((x) => x.sources))];
  const iap = sources.length === 1 && sources[0] === "35.235.240.0/20" ? " (Identity-Aware Proxy TCP forwarding)" : "";
  return pass(`Administrative ports only accept connections from ${sources.join(", ")}${iap}.`, admin[0].line);
}

/** CN05.AR04/AR05/AR06: the instance isn't reachable from outside the trust perimeter. */
const notInternetReachable = bucket((v) => {
  const world = v.ingress.find(fromWorld);
  if (v.publicIp && world) return fail(`The instance has an external IP (access_config) and ${world.via} allows ${describePorts(world)} from the internet.`, world.line);
  const unknown = unknownNetwork(v);
  if (unknown) return unknown;
  if (v.publicIp) return warn("The instance has an external IP (access_config); no firewall rule admits the internet, but it's still addressable from outside the network.", v.publicIp);
  if (world) return warn(`No external IP, but ${world.via} allows ${describePorts(world)} from 0.0.0.0/0; anything routed into the VPC can reach it.`, world.line);
  return pass("Not reachable from the internet: no access_config (external IP), and no firewall rule admits 0.0.0.0/0.", first(subBlocks(v.res.block, "network_interface"))?.line ?? v.res.block.line);
});

/** CN03.AR02/AR04: logins need an identity-bound credential and originate inside the trust perimeter. */
function login(v: GceView, t: GceTemplateView): Evidence {
  let credential: Evidence;
  if (t.orgOsLogin) credential = pass("Organisation policy compute.requireOsLogin enforces OS Login, so SSH access is granted through IAM.", t.orgOsLogin);
  else if (v.osLogin?.value === true) credential = pass("OS Login is enabled, so SSH access is granted through IAM and keys are tied to Google identities.", v.osLogin.line);
  else if (v.osLogin?.value === false) credential = warn("enable-oslogin is FALSE, so SSH keys are managed in metadata (including project-wide keys) rather than tied to IAM identities.", v.osLogin.line);
  else if (t.projectOsLogin?.value) credential = pass("OS Login is enabled in project metadata, so SSH access is granted through IAM.", t.projectOsLogin.line);
  else credential = warn("OS Login isn't enabled, so SSH keys are managed in instance or project metadata rather than tied to IAM identities. Set enable-oslogin = \"TRUE\".", v.res.block.attrs.metadata?.line ?? v.res.block.line);
  return combine(credential, adminAccess(v));
}

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template(() =>
  pass("Admin Activity audit logs are always written for Compute Engine configuration changes and can't be turned off; they're kept for 400 days."),
);

const logsSeparatedFromResource = bucket((v) => {
  if (v.opsAgent) return pass(`OS and login logs are shipped to Cloud Logging, off the instance: ${v.opsAgent.how}.`, v.opsAgent.line);
  return warn("Admin Activity audit logs live in Cloud Logging, separate from the instance, but its OS and login logs stay on its own disk unless the Ops Agent ships them.", v.res.block.line);
});

// Data protection -------------------------------------------------------------

function snapshotPolicy(v: GceView, t: GceTemplateView): { policy: TfResource; line: number } | undefined {
  const policies = t.model.ofType("google_compute_resource_policy").filter((p) => subBlocks(p.block, "snapshot_schedule_policy").length);
  for (const p of policies) {
    const ref = v.bootPolicies.find((x) => references(x, p.address));
    if (ref) return { policy: p, line: ref.line };
  }
  const name = t.model.str(v.res.block.attrs.name?.value);
  for (const a of t.model.ofType("google_compute_disk_resource_policy_attachment")) {
    const disk = a.block.attrs.disk?.value;
    const covers = references(disk, v.res.address) || v.disks.some((d) => d.source && references(disk, d.source.address)) || (name !== undefined && t.model.str(disk) === name);
    const p = covers && policies.find((p) => references(a.block.attrs.name?.value, p.address));
    if (p) return { policy: p, line: a.block.line };
  }
  return undefined;
}

const recoverableCopy = bucket((v, t) => {
  const s = snapshotPolicy(v, t);
  if (!s) return fail("No snapshot schedule is attached to this instance's disks, so they have no recoverable copy outside the zone they live in.", v.res.block.line);
  const props = first(subBlocks(first(subBlocks(s.policy.block, "snapshot_schedule_policy"))!, "snapshot_properties"));
  const locations = t.model.strList(props?.attrs.storage_locations?.value);
  const where = locations.length ? `in ${locations.join(", ")}` : "in the nearest multi-region";
  return pass(`${s.policy.address} snapshots the disks on a schedule; snapshots are stored ${where}, outside the instance's zone.`, s.line);
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((v, t) => {
  const z = v.zone;
  const line = z?.line ?? v.res.block.line;
  const region = z?.value?.replace(/-[a-z]$/, "");
  if (!region) return warn("The zone is unknown or computed at apply time.", line);
  if (!isTrusted(region, t.settings)) return fail(`Deployed to ${z!.value} (${region}), which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
  return pass(`Deployed to ${z!.value} in ${region}, which is in the trusted list.`, line);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "google_", "Google Cloud", (r) => gcpLocation(t.model, r)));

// ── Registry ──────────────────────────────────────────────────────────────────

export const gcp: ProviderRules<GceView, GceTemplateView> = {
  id: "gcp",
  label: "Google Cloud",
  prefix: "google_",
  noun: { one: "instance", many: "instances" },
  build: buildGceView,
  rules: {
    "CCC.Core.CN02.AR01": encryptionAtRest,
    // CN03.AR01/AR03 (MFA for the console) depend on Cloud Identity settings: live test only.
    "CCC.Core.CN03.AR02": bucket(login),
    "CCC.Core.CN03.AR04": bucket(login),
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN05.AR01": bucket(adminAccess),
    "CCC.Core.CN05.AR02": bucket(adminAccess),
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
