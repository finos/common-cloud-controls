/**
 * Static rules mapping Azure Virtual Network Terraform configuration to CCC
 * assessment requirements for the CCC.VPC catalog (and the CCC.Core controls it
 * imports).
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see Azure Policy assignments, NSGs or flow logs
 * created elsewhere, or how traffic actually flows at runtime. NSG rule
 * priorities are not evaluated. The authoritative checks are the behavioural
 * tests in modules/features.
 *
 * Each rule is keyed by assessment-requirement ID. Requirements without a rule
 * are shown as "Live test only" in the UI.
 */

import type { HclBlock, HclValue } from "../../hcl/parser";
import { references, subBlocks, textOf, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { azureLocation, fail, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";
import { adminPortsClosed, describe, flatText, parsePortSpec, peeringVerdict, perimeterIngress, plaintextBlocked, type Ingress, type Peering, type PortRange } from "./network";

// ── Per-VNet view of the template ─────────────────────────────────────────────

interface SubnetInfo {
  /** Address of the azurerm_subnet, or "<vnet address> subnet <name>" for inline subnet blocks. */
  address: string;
  name?: string;
  line: number;
  res?: TfResource;
  /** The NSG associated with the subnet, if any. */
  nsg?: TfResource;
  outbound?: { value?: boolean; line: number };
}

interface FlowLog {
  res: TfResource;
  scope: "vnet" | "subnet" | "nsg";
  enabled?: boolean;
  line: number;
  storage?: HclValue;
}

export interface VnetView {
  res: TfResource;
  name?: string;
  location?: string;
  subnets: SubnetInfo[];
  nsgs: TfResource[];
  ingress: Ingress[];
  flowLogs: FlowLog[];
  peerings: Peering[];
}

export interface AzureVnetTemplateView extends BaseView<VnetView> {
  activityLogExports: TfResource[];
  /** An assigned Azure Policy that denies peerings outside an allow-list. */
  peeringGuardrail?: { address: string; line: number };
}

const VNET = "azurerm_virtual_network";
/** Platform subnets that can't (or needn't) carry an NSG. */
const SPECIAL_SUBNETS = new Set(["gatewaysubnet", "azurefirewallsubnet", "azurefirewallmanagementsubnet", "azurebastionsubnet", "routeserversubnet"]);

const rawText = (v: HclValue | undefined) => (!v ? "" : v.t === "str" ? v.v : textOf(v));

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

/** True when `v` points at `res` by reference, or by a literal equal to its name. */
function pointsAt(model: TfModel, v: HclValue | undefined, res: TfResource): boolean {
  if (references(v, res.address)) return true;
  const name = model.str(res.block.attrs.name?.value);
  return !!name && model.str(v) === name;
}

function portsOf(model: TfModel, b: HclBlock): PortRange[] {
  const protocol = (model.str(b.attrs.protocol?.value) ?? "*").toLowerCase();
  if (protocol === "icmp") return [];
  const specs = [...model.strList(b.attrs.destination_port_range?.value), ...model.strList(b.attrs.destination_port_ranges?.value)];
  return specs.map(parsePortSpec).filter((p): p is PortRange => !!p);
}

function readRule(model: TfModel, where: string, b: HclBlock): Ingress | undefined {
  const a = b.attrs;
  if ((model.str(a.direction?.value) ?? "").toLowerCase() !== "inbound") return undefined;
  if ((model.str(a.access?.value) ?? "").toLowerCase() !== "allow") return undefined;
  const sources = [...model.strList(a.source_address_prefix?.value), ...model.strList(a.source_address_prefixes?.value)];
  if (!sources.length) sources.push(a.source_application_security_group_ids ? "an application security group" : "an unknown source");
  const name = model.str(a.name?.value);
  return { where: b.type === "security_rule" && name ? `${where} rule "${name}"` : where, ports: portsOf(model, b), sources, line: b.line };
}

function findPeeringGuardrail(model: TfModel): { address: string; line: number } | undefined {
  const assignments = ["azurerm_subscription_policy_assignment", "azurerm_resource_group_policy_assignment", "azurerm_management_group_policy_assignment", "azurerm_resource_policy_assignment"].flatMap(
    (t) => model.ofType(t),
  );
  for (const def of model.ofType("azurerm_policy_definition")) {
    const rule = flatText(model, def.block.attrs.policy_rule?.value);
    if (!/virtualNetworkPeerings/i.test(rule) || !/\bdeny\b/i.test(rule)) continue;
    const assigned = assignments.find((a) => references(a.block.attrs.policy_definition_id?.value, def.address));
    if (assigned) return { address: assigned.address, line: assigned.block.line };
  }
  return undefined;
}

export function buildAzureVnetView(model: TfModel, settings: LabsSettings): AzureVnetTemplateView {
  const vnets = model.ofType(VNET);
  const allNsgs = model.ofType("azurerm_network_security_group");
  const associations = model.ofType("azurerm_subnet_network_security_group_association");
  const nsgFor = (v: HclValue | undefined) => allNsgs.find((n) => references(v, n.address));

  const buckets = vnets.map((res): VnetView => {
    const a = res.block.attrs;
    const subnets: SubnetInfo[] = [];

    for (const s of model.ofType("azurerm_subnet").filter((s) => pointsAt(model, s.block.attrs.virtual_network_name?.value, res))) {
      const assoc = associations.find((x) => references(x.block.attrs.subnet_id?.value, s.address));
      const ob = s.block.attrs.default_outbound_access_enabled;
      subnets.push({
        address: s.address,
        name: model.str(s.block.attrs.name?.value),
        line: s.block.line,
        res: s,
        nsg: nsgFor(assoc?.block.attrs.network_security_group_id?.value),
        outbound: ob ? { value: model.bool(ob.value), line: ob.line } : undefined,
      });
    }
    for (const s of subBlocks(res.block, "subnet")) {
      const name = model.str(s.attrs.name?.value);
      const ob = s.attrs.default_outbound_access_enabled;
      subnets.push({
        address: `${res.address} subnet "${name ?? "?"}"`,
        name,
        line: s.line,
        nsg: nsgFor(s.attrs.security_group?.value),
        outbound: ob ? { value: model.bool(ob.value), line: ob.line } : undefined,
      });
    }

    // NSGs that filter this VNet: those on its subnets, or (with a single VNet) every NSG in the template,
    // since an NSG attached to a NIC still filters traffic inside the only network there is.
    const nsgs = [...new Set(subnets.map((s) => s.nsg).filter((n): n is TfResource => !!n))];
    if (vnets.length === 1) for (const n of allNsgs) if (!nsgs.includes(n)) nsgs.push(n);

    const ingress: Ingress[] = [];
    for (const nsg of nsgs) {
      for (const r of subBlocks(nsg.block, "security_rule")) {
        const i = readRule(model, nsg.address, r);
        if (i) ingress.push(i);
      }
      for (const r of model.ofType("azurerm_network_security_rule")) {
        if (!pointsAt(model, r.block.attrs.network_security_group_name?.value, nsg)) continue;
        const i = readRule(model, r.address, r.block);
        if (i) ingress.push(i);
      }
    }

    const flowLogs: FlowLog[] = [];
    for (const f of model.ofType("azurerm_network_watcher_flow_log")) {
      const fa = f.block.attrs;
      const target = fa.target_resource_id?.value;
      const scope = references(target, res.address)
        ? "vnet"
        : subnets.some((s) => s.res && references(target, s.res.address))
          ? "subnet"
          : nsgs.some((n) => references(fa.network_security_group_id?.value, n.address))
            ? "nsg"
            : undefined;
      if (!scope) continue;
      flowLogs.push({ res: f, scope, enabled: model.bool(fa.enabled?.value), line: fa.enabled?.line ?? f.block.line, storage: fa.storage_account_id?.value });
    }

    const peerings: Peering[] = [];
    for (const p of model.ofType("azurerm_virtual_network_peering")) {
      const pa = p.block.attrs;
      const local = vnets.find((v) => pointsAt(model, pa.virtual_network_name?.value, v));
      const remote = vnets.find((v) => references(pa.remote_virtual_network_id?.value, v.address));
      if (local === res) {
        peerings.push({ res: p, peer: remote?.address, external: describe(model, pa.remote_virtual_network_id?.value), line: pa.remote_virtual_network_id?.line ?? p.block.line });
      } else if (remote === res && local) {
        peerings.push({ res: p, peer: local.address, line: p.block.line });
      }
    }

    return { res, name: model.str(a.name?.value), location: azureLocation(model, a.location?.value), subnets, nsgs, ingress, flowLogs, peerings };
  });

  const activityLogExports = model.ofType("azurerm_monitor_diagnostic_setting").filter((d) => {
    const target = d.block.attrs.target_resource_id?.value;
    const t = rawText(target);
    const subscription = (target?.t === "ref" && target.path.startsWith("data.azurerm_subscription")) || (/\/subscriptions\//i.test(t) && !/providers\//i.test(t)) || /azurerm_subscription/.test(t);
    if (!subscription) return false;
    const { categories, groups } = categoriesOf(model, d);
    return categories.has("Administrative") || groups.has("allLogs") || groups.has("audit");
  });

  return { model, buckets, settings, activityLogExports, peeringGuardrail: findPeeringGuardrail(model) };
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<VnetView, AzureVnetTemplateView>();
const isSpecial = (s: SubnetInfo) => !!s.name && SPECIAL_SUBNETS.has(s.name.toLowerCase());

// CCC.VPC ---------------------------------------------------------------------

const noDefaultNetwork = template(() =>
  pass("Azure doesn't create a virtual network, subnet or NSG when a subscription is created; network resources only exist once they're declared."),
);

const noPublicIpByDefault = bucket((v) => {
  const subnets = v.subnets.filter((s) => !isSpecial(s));
  if (!subnets.length) return na("No subnets are declared for this virtual network.");
  const on = subnets.find((s) => s.outbound?.value === true);
  if (on) return fail(`${on.address} sets default_outbound_access_enabled = true, so VMs without an explicit public IP still get an implicit one for outbound traffic.`, on.outbound!.line);
  const unset = subnets.find((s) => !s.outbound);
  if (unset) {
    return warn(
      `${unset.address} doesn't set default_outbound_access_enabled. The azurerm provider defaults it to true, giving VMs an implicit public outbound IP; set it to false to make the subnet private.`,
      unset.line,
    );
  }
  const which = subnets.length === 1 ? subnets[0].address : `all ${subnets.length} subnets`;
  return pass(`default_outbound_access_enabled is false for ${which}, so nothing gets a public IP unless one is attached explicitly.`, subnets[0].outbound!.line);
});

const peeringAllowListed = bucket((v, t) =>
  peeringVerdict(
    v.peerings,
    t.peeringGuardrail,
    "virtual network",
    "Assign an Azure Policy that denies virtualNetworkPeerings whose remote network isn't on an allow-list.",
    v.res.block.line,
  ),
);

const flowLogsCaptureAll = bucket((v) => {
  const vnet = v.flowLogs.find((f) => f.scope === "vnet");
  if (vnet) {
    if (vnet.enabled === false) return fail(`${vnet.res.address} is declared with enabled = false.`, vnet.line);
    return pass(`${vnet.res.address} is a VNet flow log, recording every allowed and denied flow through the virtual network.`, vnet.line);
  }
  const nsg = v.flowLogs.find((f) => f.scope === "nsg" && f.enabled !== false);
  if (nsg) {
    return warn(
      `${nsg.res.address} is an NSG flow log, which only covers traffic through one NSG, and Azure stopped accepting new NSG flow logs in June 2025. Use a VNet flow log (target_resource_id = the virtual network).`,
      nsg.line,
    );
  }
  const sub = v.flowLogs.find((f) => f.scope === "subnet" && f.enabled !== false);
  if (sub) return warn(`${sub.res.address} only covers one subnet; target the virtual network so every subnet is logged.`, sub.line);
  return fail("No azurerm_network_watcher_flow_log targets this virtual network, so its traffic isn't logged.", v.res.block.line);
});

// CCC.Core --------------------------------------------------------------------

const plaintext = bucket((v) => plaintextBlocked(v.ingress, "NSG rule on this virtual network"));

const adminPorts = bucket((v) => {
  const bare = v.subnets.find((s) => !s.nsg && !isSpecial(s));
  const otherwise = bare
    ? warn(`No NSG rule admits SSH or RDP from the internet, but ${bare.address} has no network security group, so nothing filters inbound traffic to resources in it.`, bare.line)
    : pass(
        v.subnets.length
          ? "No NSG rule admits SSH, RDP or all ports from the internet, and every subnet has a network security group."
          : "No NSG rule admits SSH, RDP or all ports from the internet.",
        v.ingress[0]?.line,
      );
  return adminPortsClosed(v.ingress, otherwise);
});

const perimeter = bucket((v) => perimeterIngress(v.ingress, "NSG rule on this virtual network"));

const adminActionsLogged = template((t) => {
  const d = t.activityLogExports[0];
  if (d) return pass(`${d.address} exports the subscription Activity Log, which records every network configuration change (who, when, result).`, d.block.line);
  return fail("The Activity Log only keeps network configuration changes for 90 days, and no diagnostic setting exports it (Administrative category) from the subscription.");
});

const regionTrusted = bucket((v, t) => {
  const line = v.res.block.attrs.location?.line ?? v.res.block.line;
  if (!v.location) return warn("The location is unknown or computed at apply time.", line);
  if (isTrusted(v.location, t.settings)) return pass(`Deployed to ${v.location}, which is in the trusted list.`, line);
  return fail(`Deployed to ${v.location}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) =>
  locationsTrusted(t, "azurerm_", "Azure", (r) => {
    if (!r.block.attrs.location) return null;
    const l = azureLocation(t.model, r.block.attrs.location.value);
    return l?.toLowerCase() === "global" ? null : l;
  }),
);

const enumerationLogged = bucket((v) => {
  const f = v.flowLogs.find((x) => x.enabled !== false);
  if (f) return pass(`${f.res.address} records denied flows (source, destination port and time), which is how port scans and probes show up.`, f.line);
  return fail("No flow logs, so denied connection attempts (e.g. port scans) against this virtual network aren't logged.", v.res.block.line);
});

const logsSeparated = bucket((v, t) => {
  const f = v.flowLogs[0];
  if (!f) return na("No flow logs are configured for this virtual network (see CCC.VPC.CN04).");
  const dest = f.storage ? `storage account ${describe(t.model, f.storage)}` : "a storage account";
  return pass(`Flow logs are written to ${dest}, outside the virtual network they record; reading them needs storage permissions, not network access.`, f.res.block.attrs.storage_account_id?.line ?? f.res.block.line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const azure: ProviderRules<VnetView, AzureVnetTemplateView> = {
  id: "azure",
  label: "Azure",
  prefix: "azurerm_",
  noun: { one: "virtual network", many: "virtual networks" },
  build: buildAzureVnetView,
  rules: {
    // CCC.Core (imported by CCC.VPC). CN07.AR01 (alerting on enumeration) needs Defender / Sentinel: live test only.
    "CCC.Core.CN01.AR03": plaintext,
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN05.AR04": perimeter,
    "CCC.Core.CN05.AR06": adminPorts,
    "CCC.Core.CN06.AR01": regionTrusted,
    "CCC.Core.CN06.AR02": childRegionsTrusted,
    "CCC.Core.CN07.AR02": enumerationLogged,
    "CCC.Core.CN09.AR01": logsSeparated,

    // CCC.VPC
    "CCC.VPC.CN01.AR01": noDefaultNetwork,
    "CCC.VPC.CN02.AR01": noPublicIpByDefault,
    "CCC.VPC.CN03.AR01": peeringAllowListed,
    "CCC.VPC.CN04.AR01": flowLogsCaptureAll,
  },
};
