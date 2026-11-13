/**
 * Static rules mapping Azure Virtual Machines Terraform (azurerm provider) to CCC
 * assessment requirements for CCC.VM, which currently consists of the CCC.Core
 * controls it imports.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * Rules only see what the template declares: Azure Policy, RBAC assignments,
 * NSGs or vaults created elsewhere, and software inside the image are invisible.
 * The authoritative checks are the behavioural tests in modules/features.
 *
 * azurerm_linux_virtual_machine and azurerm_windows_virtual_machine are the
 * primary resources. Network exposure comes from their NICs (public IPs) and the
 * NSGs associated with the NIC or its subnet; disk encryption from os_disk,
 * encryption at host and disk encryption sets; replication from Azure Backup.
 */

import type { HclBlock, HclValue } from "../../hcl/parser";
import { references, subBlocks, textOf, type TfModel, type TfResource } from "../../terraform/model";
import type { Evidence, LabsSettings } from "../../types";
import { azureLocation, fail, first, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

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

function rawText(v: HclValue | undefined): string {
  if (!v) return "";
  return v.t === "str" ? v.v : textOf(v);
}

/** Days in an ISO 8601 duration such as P90D, P3M or P1Y (months counted as 30 days). */
function isoDays(s: string | undefined): number | undefined {
  const m = s && /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(s.trim());
  if (!m || s!.trim() === "P") return undefined;
  return Number(m[1] ?? 0) * 365 + Number(m[2] ?? 0) * 30 + Number(m[3] ?? 0) * 7 + Number(m[4] ?? 0);
}

const ADMIN_PORTS: Record<number, string> = { 22: "SSH (22)", 3389: "RDP (3389)", 5985: "WinRM (5985)", 5986: "WinRM (5986)" };
const WORLD = ["*", "0.0.0.0/0", "0.0.0.0", "::/0", "internet", "any"];

interface Ingress {
  ranges: [number, number][];
  sources: string[];
  line: number;
  via: string;
}

const isWorld = (s: string) => WORLD.includes(s.toLowerCase());
const fromWorld = (i: Ingress) => i.sources.some(isWorld);
const adminPortsIn = (i: Ingress) =>
  Object.entries(ADMIN_PORTS)
    .filter(([p]) => i.ranges.some(([a, b]) => Number(p) >= a && Number(p) <= b))
    .map(([, name]) => name);
const describePorts = (i: Ingress) =>
  i.ranges.map(([a, b]) => (a <= 0 && b >= 65535 ? "all ports" : a === b ? `port ${a}` : `ports ${a}-${b}`)).join(", ");

function parsePortRange(s: string): [number, number] {
  if (s === "*") return [0, 65535];
  const [a, b] = s.split("-").map((x) => Number(x.trim()));
  if (Number.isNaN(a)) return [0, 65535];
  return [a, Number.isNaN(b ?? NaN) ? a : b];
}

function readRule(model: TfModel, b: HclBlock, via: string): Ingress | undefined {
  const a = b.attrs;
  if ((model.str(a.direction?.value) ?? "").toLowerCase() !== "inbound") return undefined;
  if ((model.str(a.access?.value) ?? "").toLowerCase() !== "allow") return undefined;
  const ports = [...model.strList(a.destination_port_range?.value), ...model.strList(a.destination_port_ranges?.value)];
  const sources = [...model.strList(a.source_address_prefix?.value), ...model.strList(a.source_address_prefixes?.value)];
  return { ranges: (ports.length ? ports : ["*"]).map(parsePortRange), sources, line: b.line, via };
}

// ── Per-VM view of the template ───────────────────────────────────────────────

interface Disk {
  name: string;
  des?: HclValue;
  line: number;
}

interface Located<T> {
  value: T;
  line: number;
}

export interface VmView {
  res: TfResource;
  windows: boolean;
  location?: string;
  zone?: Located<string | undefined>;
  disks: Disk[];
  zoneRedundantOsDisk?: number;
  encryptionAtHost?: Located<boolean | undefined>;
  adeExtension?: TfResource;
  nics: TfResource[];
  externalNics: number;
  publicIps: { address: string; basic: boolean; line: number }[];
  nsgs: TfResource[];
  externalNsgs: number;
  ingress: Ingress[];
  passwordAuthDisabled?: Located<boolean | undefined>;
  entraLogin?: TfResource;
  monitorAgent?: TfResource;
  dcrAssociation?: TfResource;
  backup?: { res: TfResource; vault?: TfResource };
}

export interface AzureVmView extends BaseView<VmView> {
  activityLogExports: TfResource[];
}

const VM_TYPES = ["azurerm_linux_virtual_machine", "azurerm_windows_virtual_machine"];

function nsgIngress(model: TfModel, nsg: TfResource): Ingress[] {
  const out: Ingress[] = [];
  for (const r of subBlocks(nsg.block, "security_rule")) {
    const x = readRule(model, r, `${nsg.address} rule "${model.str(r.attrs.name?.value) ?? "?"}"`);
    if (x) out.push(x);
  }
  const name = model.str(nsg.block.attrs.name?.value);
  for (const r of model.ofType("azurerm_network_security_rule")) {
    const v = r.block.attrs.network_security_group_name?.value;
    if (!references(v, nsg.address) && !(name !== undefined && model.str(v) === name)) continue;
    const x = readRule(model, r.block, r.address);
    if (x) out.push(x);
  }
  return out;
}

export function buildAzureVmView(model: TfModel, settings: LabsSettings): AzureVmView {
  const extensionsOf = (vm: TfResource) => model.ofType("azurerm_virtual_machine_extension").filter((e) => references(e.block.attrs.virtual_machine_id?.value, vm.address));
  const extType = (e: TfResource) => model.str(e.block.attrs.type?.value) ?? "";

  const buckets = VM_TYPES.flatMap((t) => model.ofType(t)).map((res): VmView => {
    const b = res.block;
    const os = first(subBlocks(b, "os_disk"));
    const disks: Disk[] = [{ name: "OS disk", des: os?.attrs.disk_encryption_set_id?.value, line: os?.attrs.disk_encryption_set_id?.line ?? os?.line ?? b.line }];
    for (const att of model.ofType("azurerm_virtual_machine_data_disk_attachment")) {
      if (!references(att.block.attrs.virtual_machine_id?.value, res.address)) continue;
      const d = model.ofType("azurerm_managed_disk").find((m) => references(att.block.attrs.managed_disk_id?.value, m.address));
      if (d) disks.push({ name: d.address, des: d.block.attrs.disk_encryption_set_id?.value, line: d.block.attrs.disk_encryption_set_id?.line ?? d.block.line });
    }

    const nicRefs = items(model, b.attrs.network_interface_ids?.value);
    const nics = model.ofType("azurerm_network_interface").filter((n) => nicRefs.some((v) => references(v, n.address)));
    const ipConfigs = nics.flatMap((n) => subBlocks(n.block, "ip_configuration"));

    const publicIps: VmView["publicIps"] = [];
    for (const c of ipConfigs) {
      const v = c.attrs.public_ip_address_id;
      if (!v || model.resolve(v.value)?.t === "null") continue;
      const pip = model.ofType("azurerm_public_ip").find((p) => references(v.value, p.address));
      publicIps.push({ address: pip?.address ?? "a public IP", basic: (pip && model.str(pip.block.attrs.sku?.value)?.toLowerCase() === "basic") ?? false, line: v.line });
    }

    const nsgRefs: (HclValue | undefined)[] = [];
    for (const a of model.ofType("azurerm_network_interface_security_group_association")) {
      if (nics.some((n) => references(a.block.attrs.network_interface_id?.value, n.address))) nsgRefs.push(a.block.attrs.network_security_group_id?.value);
    }
    const subnets = model.ofType("azurerm_subnet").filter((s) => ipConfigs.some((c) => references(c.attrs.subnet_id?.value, s.address)));
    for (const a of model.ofType("azurerm_subnet_network_security_group_association")) {
      if (subnets.some((s) => references(a.block.attrs.subnet_id?.value, s.address))) nsgRefs.push(a.block.attrs.network_security_group_id?.value);
    }
    const nsgs = model.ofType("azurerm_network_security_group").filter((n) => nsgRefs.some((v) => references(v, n.address)));

    const exts = extensionsOf(res);
    const backup = model.ofType("azurerm_backup_protected_vm").find((p) => references(p.block.attrs.source_vm_id?.value, res.address));
    const vaultName = backup && model.str(backup.block.attrs.recovery_vault_name?.value);
    const vault =
      backup &&
      model
        .ofType("azurerm_recovery_services_vault")
        .find((v) => references(backup.block.attrs.recovery_vault_name?.value, v.address) || (vaultName !== undefined && model.str(v.block.attrs.name?.value) === vaultName));

    const attr = <T>(key: string, read: (v: HclValue | undefined) => T): Located<T> | undefined => (b.attrs[key] ? { value: read(b.attrs[key].value), line: b.attrs[key].line } : undefined);
    const osType = model.str(os?.attrs.storage_account_type?.value) ?? "";

    return {
      res,
      windows: res.type === "azurerm_windows_virtual_machine",
      location: azureLocation(model, b.attrs.location?.value),
      zone: attr("zone", (v) => model.str(v)),
      disks,
      zoneRedundantOsDisk: /_ZRS$/i.test(osType) ? os!.attrs.storage_account_type!.line : undefined,
      encryptionAtHost: attr("encryption_at_host_enabled", (v) => model.bool(v)),
      adeExtension: exts.find((e) => /^AzureDiskEncryption/.test(extType(e))),
      nics,
      externalNics: nicRefs.length - nics.length,
      publicIps,
      nsgs,
      externalNsgs: nsgRefs.filter((v) => !nsgs.some((n) => references(v, n.address))).length,
      ingress: nsgs.flatMap((n) => nsgIngress(model, n)),
      passwordAuthDisabled: attr("disable_password_authentication", (v) => model.bool(v)),
      entraLogin: exts.find((e) => /^AAD(SSH)?Login/.test(extType(e))),
      monitorAgent: exts.find((e) => /^(AzureMonitor(Linux|Windows)Agent|OmsAgentForLinux|MicrosoftMonitoringAgent)$/.test(extType(e))),
      dcrAssociation: model.ofType("azurerm_monitor_data_collection_rule_association").find((a) => references(a.block.attrs.target_resource_id?.value, res.address)),
      backup: backup ? { res: backup, vault } : undefined,
    };
  });

  const activityLogExports = model.ofType("azurerm_monitor_diagnostic_setting").filter((d) => {
    const target = d.block.attrs.target_resource_id?.value;
    const t = rawText(target);
    const subscription = (target?.t === "ref" && target.path.startsWith("data.azurerm_subscription")) || (/\/subscriptions\//i.test(t) && !/providers\//i.test(t)) || /azurerm_subscription/.test(t);
    if (!subscription) return false;
    return [...subBlocks(d.block, "enabled_log"), ...subBlocks(d.block, "log")].some((l) => {
      const c = model.str(l.attrs.category?.value);
      const g = model.str(l.attrs.category_group?.value);
      return c === "Administrative" || g === "allLogs" || g === "audit";
    });
  });

  return { model, buckets, settings, activityLogExports };
}

// ── Key helpers ───────────────────────────────────────────────────────────────

interface KeyRef {
  des?: TfResource;
  key?: TfResource;
  line: number;
}

function keysInUse(v: VmView, t: AzureVmView): KeyRef[] {
  const out: KeyRef[] = [];
  for (const d of v.disks) {
    if (!d.des) continue;
    const des = t.model.ofType("azurerm_disk_encryption_set").find((s) => references(d.des, s.address));
    const key = des && t.model.ofType("azurerm_key_vault_key").find((k) => references(des.block.attrs.key_vault_key_id?.value, k.address));
    if (!out.some((o) => o.des === des && o.key === key)) out.push({ des, key, line: d.line });
  }
  return out;
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<VmView, AzureVmView>();

// Encryption at rest ----------------------------------------------------------

const encryptionAtRest = bucket((v) => {
  const h = v.encryptionAtHost;
  if (h?.value === true) return pass("Encryption at host is enabled, so the OS and data disks, the temp disk and disk caches are all encrypted at rest.", h.line);
  if (v.adeExtension) return pass(`${v.adeExtension.address} applies Azure Disk Encryption inside the guest, covering the OS, data and temp disks.`, v.adeExtension.block.line);
  return warn(
    "Managed disks are always encrypted at rest (SSE), but the temp disk and disk caches are only encrypted with encryption_at_host_enabled = true.",
    h?.line ?? v.disks[0].line,
  );
});

const customerManagedKeys = bucket((v) => {
  const plain = v.disks.find((d) => !d.des);
  if (plain) return fail(`The ${plain.name} is encrypted with a platform-managed key. Set disk_encryption_set_id to a disk encryption set backed by your own Key Vault key.`, plain.line);
  const what = v.disks.length === 1 ? `The ${v.disks[0].name} is` : `All ${v.disks.length} disks are`;
  return pass(`${what} encrypted through a disk encryption set with a customer-managed key.`, v.disks[0].line);
});

const keyAlgorithm = bucket((v, t) => {
  const keys = keysInUse(v, t);
  if (!keys.length) return na("No customer-managed key encrypts this VM's disks (see CCC.Core.CN11.AR03).");
  const external = keys.find((k) => !k.key);
  if (external) return warn("The disk encryption set or its Key Vault key is defined outside this template, so the key type can't be checked.", external.line);
  for (const { key } of keys) {
    const a = key!.block.attrs;
    const type = t.model.str(a.key_type?.value) ?? "";
    const size = t.model.num(a.key_size?.value);
    if (!/^RSA/.test(type)) return warn(`${key!.address} is a ${type || "computed"} key; disk encryption sets need an RSA key.`, a.key_type?.line ?? key!.block.line);
    if (size !== undefined && size < 3072) return warn(`${key!.address} is RSA-${size}. It's still accepted, but 3072 or 4096 bits is the current recommendation.`, a.key_size?.line ?? key!.block.line);
  }
  const k = keys[0].key!;
  return pass(`${k.address} is an ${t.model.str(k.block.attrs.key_type?.value)}-${t.model.num(k.block.attrs.key_size?.value) ?? "?"} key.`, k.block.attrs.key_size?.line ?? k.block.line);
});

function keyRotation(maxDays: number) {
  return bucket((v, t) => {
    const keys = keysInUse(v, t);
    if (!keys.length) return na("No customer-managed key encrypts this VM's disks (see CCC.Core.CN11.AR03).");
    const external = keys.find((k) => !k.key);
    if (external) return warn("The disk encryption set or its Key Vault key is defined outside this template, so its rotation can't be checked.", external.line);
    let summary: Evidence | undefined;
    for (const { des, key } of keys) {
      const policy = first(subBlocks(key!.block, "rotation_policy"));
      const auto = policy && first(subBlocks(policy, "automatic"));
      if (!auto) return fail(`${key!.address} has no rotation_policy with an automatic block, so the key is never rotated (limit: ${maxDays} days).`, policy?.line ?? key!.block.line);
      const after = isoDays(t.model.str(auto.attrs.time_after_create?.value));
      const expire = isoDays(t.model.str(policy.attrs.expire_after?.value));
      const before = isoDays(t.model.str(auto.attrs.time_before_expiry?.value));
      const days = after ?? (expire !== undefined && before !== undefined ? expire - before : undefined);
      if (days === undefined) return warn(`${key!.address}'s rotation period couldn't be read.`, auto.line);
      if (days > maxDays) return fail(`${key!.address} rotates every ${days} days, above the ${maxDays}-day limit.`, auto.line);
      if (des && t.model.bool(des.block.attrs.auto_key_rotation_enabled?.value) !== true) {
        return fail(`${key!.address} rotates, but ${des.address} doesn't set auto_key_rotation_enabled = true, so the disks keep using the old key version.`, des.block.line);
      }
      summary ??= pass(`${key!.address} rotates every ${days} days (limit: ${maxDays}), and ${des!.address} picks up each new version automatically.`, auto.line);
    }
    return summary!;
  });
}

// Access ----------------------------------------------------------------------

function unknownNetwork(v: VmView): Evidence | undefined {
  if (v.externalNics) return warn("A network interface of this VM is defined outside this template, so its exposure can't be checked.", v.res.block.attrs.network_interface_ids?.line ?? v.res.block.line);
  if (v.externalNsgs) return warn("A network security group associated with this VM is defined outside this template, so its rules can't be checked.", v.res.block.line);
  return undefined;
}

/** CN05.AR01/AR02: administrative access (SSH, RDP, WinRM) is only possible from inside the trust perimeter. */
function adminAccess(v: VmView): Evidence {
  const open = v.ingress.find((x) => fromWorld(x) && adminPortsIn(x).length);
  const pip = v.publicIps[0];
  if (open) {
    const what = `${open.via} allows ${adminPortsIn(open).join(", ")} from ${open.sources.filter(isWorld).join(", ")}`;
    if (!pip) return warn(`${what}. The VM has no public IP, so it isn't directly reachable from the internet, but narrow the rule.`, open.line);
    return fail(`${what}, and the VM has a public IP (${pip.address}), so anyone on the internet can attempt to log in.`, open.line);
  }
  const unknown = unknownNetwork(v);
  if (unknown) return unknown;
  if (!v.nsgs.length) {
    if (pip?.basic) return fail(`No network security group, and ${pip.address} is a Basic SKU public IP, which is open to inbound traffic by default.`, pip.line);
    return warn("No network security group is associated with the VM's NIC or subnet, so nothing restricts who can reach SSH or RDP.", v.nics[0]?.block.line ?? v.res.block.line);
  }
  const admin = v.ingress.filter((x) => adminPortsIn(x).length);
  if (!admin.length) return pass("No NSG rule allows SSH, RDP or WinRM, so the VM can't be administered over the network (use Azure Bastion or Run Command).", v.nsgs[0].block.line);
  const sources = [...new Set(admin.flatMap((x) => x.sources))];
  return pass(`Administrative ports only accept connections from ${sources.join(", ")}.`, admin[0].line);
}

/** CN05.AR04/AR05/AR06: the VM isn't reachable from outside the trust perimeter. */
const notInternetReachable = bucket((v) => {
  const world = v.ingress.find(fromWorld);
  const pip = v.publicIps[0];
  if (pip && world) return fail(`The VM has a public IP (${pip.address}) and ${world.via} allows ${describePorts(world)} from the internet.`, world.line);
  if (pip?.basic && !v.nsgs.length) return fail(`${pip.address} is a Basic SKU public IP with no NSG, so it accepts inbound traffic on every port.`, pip.line);
  const unknown = unknownNetwork(v);
  if (unknown) return unknown;
  if (pip) return warn(`The VM has a public IP (${pip.address}); no NSG rule admits the internet, but it's still addressable from outside the network.`, pip.line);
  if (world) return warn(`No public IP, but ${world.via} allows ${describePorts(world)} from any source; anything routed into the virtual network can reach it.`, world.line);
  return pass("Not reachable from the internet: no NIC has a public IP, and no NSG rule admits the internet.", v.nics[0]?.block.line ?? v.res.block.line);
});

/** CN03.AR02/AR04: logins need a credential and originate inside the trust perimeter. */
function login(v: VmView): Evidence {
  let credential: Evidence;
  if (v.entraLogin) credential = pass(`${v.entraLogin.address} makes logins go through Microsoft Entra ID (Conditional Access and MFA apply).`, v.entraLogin.block.line);
  else if (v.windows) credential = warn("Windows VMs authenticate with the local admin password. Add the AADLoginForWindows extension so logins go through Entra ID.", v.res.block.attrs.admin_password?.line ?? v.res.block.line);
  else if (v.passwordAuthDisabled?.value === false) credential = fail("disable_password_authentication = false, so the VM accepts password logins over SSH.", v.passwordAuthDisabled.line);
  else credential = pass("Password authentication is disabled, so SSH logins need the admin's private key.", v.passwordAuthDisabled?.line ?? first(subBlocks(v.res.block, "admin_ssh_key"))?.line ?? v.res.block.line);
  return combine(credential, adminAccess(v));
}

// Logging ---------------------------------------------------------------------

const adminActionsLogged = template((t) => {
  const d = t.activityLogExports[0];
  if (d) return pass(`${d.address} exports the subscription Activity Log (who changed which VM, when, and the result) for long-term retention.`, d.block.line);
  return fail("The Activity Log only keeps management events for 90 days, and no diagnostic setting exports it (Administrative category) from the subscription.");
});

const logsSeparatedFromResource = bucket((v, t) => {
  if (v.dcrAssociation) return pass(`${v.dcrAssociation.address} sends the VM's guest OS and login logs through the Azure Monitor Agent to a workspace off the VM.`, v.dcrAssociation.block.line);
  if (v.monitorAgent) return warn(`${v.monitorAgent.address} installs the Azure Monitor Agent, but no data collection rule is associated with the VM, so it collects nothing.`, v.monitorAgent.block.line);
  if (t.activityLogExports.length) {
    return warn(`${t.activityLogExports[0].address} keeps management activity off the VM, but its OS and login logs stay on its own disk (no Azure Monitor Agent).`, v.res.block.line);
  }
  return fail("Nothing ships logs off the VM (no Activity Log export, no Azure Monitor Agent), so its OS and login logs live only on its own disk, where an administrator can alter them.", v.res.block.line);
});

// Data protection -------------------------------------------------------------

const recoverableCopy = bucket((v, t) => {
  const b = v.backup;
  if (!b) {
    if (v.zoneRedundantOsDisk) {
      return warn("The OS disk is zone-redundant (ZRS), so it's replicated across availability zones, but no Azure Backup keeps a recoverable copy if it's corrupted or deleted.", v.zoneRedundantOsDisk);
    }
    return fail("No azurerm_backup_protected_vm protects this VM, so its disks have no recoverable copy outside the data centre they live in.", v.res.block.line);
  }
  if (!b.vault) return warn(`${b.res.address} backs the VM up to a Recovery Services vault defined outside this template, so its redundancy can't be checked.`, b.res.block.line);
  const modeAttr = b.vault.block.attrs.storage_mode_type;
  const mode = t.model.str(modeAttr?.value) ?? "GeoRedundant";
  const line = modeAttr?.line ?? b.vault.block.line;
  if (mode === "LocallyRedundant") return fail(`${b.vault.address} is LocallyRedundant, so every backup copy sits in a single data centre.`, line);
  if (mode === "ZoneRedundant") return pass(`${b.res.address} backs the VM up to ${b.vault.address}, which stores copies across availability zones (separate data centres).`, line);
  const crr = t.model.bool(b.vault.block.attrs.cross_region_restore_enabled?.value) ? ", with cross-region restore" : "";
  return pass(`${b.res.address} backs the VM up to ${b.vault.address}, which is geo-redundant (copies in the paired region${crr}).`, line);
});

// Location --------------------------------------------------------------------

const regionTrusted = bucket((v, t) => {
  const line = v.res.block.attrs.location?.line ?? v.res.block.line;
  if (!v.location) return warn("The location is unknown or computed at apply time.", line);
  if (!isTrusted(v.location, t.settings)) return fail(`Deployed to ${v.location}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
  return pass(`Deployed to ${v.location}${v.zone?.value ? ` (zone ${v.zone.value})` : ""}, which is in the trusted list.`, line);
});

const childRegionsTrusted = template((t) =>
  locationsTrusted(t, "azurerm_", "Azure", (r) => (r.block.attrs.location ? azureLocation(t.model, r.block.attrs.location.value) : null)),
);

// ── Registry ──────────────────────────────────────────────────────────────────

export const azure: ProviderRules<VmView, AzureVmView> = {
  id: "azure",
  label: "Azure",
  prefix: "azurerm_",
  noun: { one: "virtual machine", many: "virtual machines" },
  build: buildAzureVmView,
  rules: {
    "CCC.Core.CN02.AR01": encryptionAtRest,
    // CN03.AR01/AR03 (MFA for the portal) depend on Entra ID Conditional Access: live test only.
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
