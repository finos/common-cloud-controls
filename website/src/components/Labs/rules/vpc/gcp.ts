/**
 * Static rules mapping Google Cloud VPC network Terraform configuration to CCC
 * assessment requirements for the CCC.VPC catalog (and the CCC.Core controls it
 * imports).
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see organization policies, firewall policies or
 * networks created elsewhere, or how traffic actually flows at runtime. Firewall
 * rule priorities are not evaluated. The authoritative checks are the
 * behavioural tests in modules/features.
 *
 * Each rule is keyed by assessment-requirement ID. Requirements without a rule
 * are shown as "Live test only" in the UI.
 */

import type { HclBlock, HclValue } from "../../hcl/parser";
import { references, subBlocks, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { fail, first, gcpLocation, gcpProviderRegion, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";
import { ALL_PORTS, adminPortsClosed, describe, parsePortSpec, peeringVerdict, perimeterIngress, plaintextBlocked, type Ingress, type Peering, type PortRange } from "./network";

// ── Per-network view of the template ──────────────────────────────────────────

interface SubnetInfo {
  res: TfResource;
  region?: string;
  regionLine: number;
  log?: { block: HclBlock; sampling: number; metadata?: string; filter?: string };
}

export interface NetworkView {
  res: TfResource;
  name?: string;
  /** auto_create_subnetworks, which defaults to true. */
  autoMode: { value: boolean; line: number };
  subnets: SubnetInfo[];
  firewalls: TfResource[];
  ingress: Ingress[];
  peerings: Peering[];
  /** network_interface blocks in this network that request an external IP. */
  externalIps: { address: string; line: number }[];
}

interface OrgPolicy {
  address: string;
  line: number;
}

export interface GcpNetworkTemplateView extends BaseView<NetworkView> {
  skipDefaultNetwork?: OrgPolicy;
  restrictPeering?: OrgPolicy;
  vmExternalIp?: OrgPolicy;
  /** google_project resources that delete the default network at creation. */
  projectsWithoutDefaultNetwork: TfResource[];
  /** Resources that attach to the project's "default" network. */
  defaultNetworkUsers: { address: string; line: number }[];
}

const NETWORK = "google_compute_network";
/** Regional resources that fall back to the provider's region when they don't set their own. */
const PROVIDER_REGIONAL = new Set(["google_compute_subnetwork", "google_compute_router", "google_compute_router_nat", "google_compute_address"]);
const INSTANCE_TYPES = ["google_compute_instance", "google_compute_instance_template", "google_compute_region_instance_template"];
const isTrue = (model: TfModel, v: HclValue | undefined) => (model.str(v) ?? "").toLowerCase() === "true";

/** True when `v` points at the network by reference, name, or a .../networks/<name> path. */
function pointsAt(model: TfModel, v: HclValue | undefined, res: TfResource): boolean {
  if (references(v, res.address)) return true;
  const name = model.str(res.block.attrs.name?.value);
  const s = model.str(v);
  return !!name && !!s && (s === name || s.endsWith(`/networks/${name}`));
}

/**
 * Finds an organization policy that restricts `constraint`: enforced (boolean constraints),
 * deny-all, or limited to an allow-list (list constraints). Supports both the v2
 * google_org_policy_policy and the legacy *_organization_policy resources.
 */
function orgPolicy(model: TfModel, constraint: string): OrgPolicy | undefined {
  for (const r of model.ofType("google_org_policy_policy")) {
    if (!(model.str(r.block.attrs.name?.value) ?? "").endsWith(`/policies/${constraint}`)) continue;
    for (const spec of subBlocks(r.block, "spec")) {
      for (const rule of subBlocks(spec, "rules")) {
        const values = first(subBlocks(rule, "values"));
        if (isTrue(model, rule.attrs.enforce?.value) || isTrue(model, rule.attrs.deny_all?.value) || (values && model.strList(values.attrs.allowed_values?.value).length)) {
          return { address: r.address, line: rule.line };
        }
      }
    }
  }
  for (const type of ["google_project_organization_policy", "google_folder_organization_policy", "google_organization_policy"]) {
    for (const r of model.ofType(type)) {
      if (!(model.str(r.block.attrs.constraint?.value) ?? "").endsWith(constraint)) continue;
      const bp = first(subBlocks(r.block, "boolean_policy"));
      if (bp && model.bool(bp.attrs.enforced?.value)) return { address: r.address, line: bp.line };
      const lp = first(subBlocks(r.block, "list_policy"));
      const deny = lp && first(subBlocks(lp, "deny"));
      const allow = lp && first(subBlocks(lp, "allow"));
      if ((deny && model.bool(deny.attrs.all?.value)) || (allow && !model.bool(allow.attrs.all?.value) && model.strList(allow.attrs.values?.value).length)) {
        return { address: r.address, line: lp!.line };
      }
    }
  }
  return undefined;
}

function firewallIngress(model: TfModel, fw: TfResource): Ingress[] {
  const a = fw.block.attrs;
  if ((model.str(a.direction?.value) ?? "INGRESS").toUpperCase() !== "INGRESS" || model.bool(a.disabled?.value)) return [];
  const sources = [...model.strList(a.source_ranges?.value)];
  // With no source_ranges, tags or service accounts, an ingress rule applies to 0.0.0.0/0.
  if (!sources.length) sources.push(a.source_tags || a.source_service_accounts ? "tagged instances" : "0.0.0.0/0");
  return subBlocks(fw.block, "allow").map((allow) => {
    const protocol = (model.str(allow.attrs.protocol?.value) ?? "").toLowerCase();
    const specs = model.strList(allow.attrs.ports?.value);
    const ports: PortRange[] =
      protocol === "all" || ((protocol === "tcp" || protocol === "udp") && !specs.length)
        ? ALL_PORTS
        : protocol === "tcp" || protocol === "udp"
          ? specs.map(parsePortSpec).filter((p): p is PortRange => !!p)
          : [];
    return { where: fw.address, ports, sources, line: allow.line };
  });
}

export function buildGcpNetworkView(model: TfModel, settings: LabsSettings): GcpNetworkTemplateView {
  const networks = model.ofType(NETWORK);
  const providerRegion = gcpProviderRegion(model);

  const buckets = networks.map((res): NetworkView => {
    const a = res.block.attrs;
    const auto = a.auto_create_subnetworks;

    const subnets: SubnetInfo[] = model
      .ofType("google_compute_subnetwork")
      .filter((s) => pointsAt(model, s.block.attrs.network?.value, res))
      .map((s) => {
        const lc = first(subBlocks(s.block, "log_config"));
        return {
          res: s,
          region: s.block.attrs.region ? model.str(s.block.attrs.region.value) : providerRegion,
          regionLine: s.block.attrs.region?.line ?? s.block.line,
          log: lc && {
            block: lc,
            sampling: model.num(lc.attrs.flow_sampling?.value) ?? 0.5,
            metadata: model.str(lc.attrs.metadata?.value),
            filter: model.str(lc.attrs.filter_expr?.value),
          },
        };
      });

    const firewalls = model.ofType("google_compute_firewall").filter((f) => pointsAt(model, f.block.attrs.network?.value, res));
    const ingress = firewalls.flatMap((f) => firewallIngress(model, f));

    const peerings: Peering[] = [];
    for (const p of model.ofType("google_compute_network_peering")) {
      const pa = p.block.attrs;
      const local = networks.find((n) => pointsAt(model, pa.network?.value, n));
      const remote = networks.find((n) => pointsAt(model, pa.peer_network?.value, n));
      if (local === res) peerings.push({ res: p, peer: remote?.address, external: describe(model, pa.peer_network?.value), line: pa.peer_network?.line ?? p.block.line });
      else if (remote === res && local) peerings.push({ res: p, peer: local.address, line: p.block.line });
    }

    const externalIps: NetworkView["externalIps"] = [];
    for (const type of INSTANCE_TYPES) {
      for (const inst of model.ofType(type)) {
        for (const ni of subBlocks(inst.block, "network_interface")) {
          const here = pointsAt(model, ni.attrs.network?.value, res) || subnets.some((s) => references(ni.attrs.subnetwork?.value, s.res.address));
          const ac = first(subBlocks(ni, "access_config"));
          if (here && ac) externalIps.push({ address: inst.address, line: ac.line });
        }
      }
    }

    return {
      res,
      name: model.str(a.name?.value),
      autoMode: { value: auto ? model.bool(auto.value) !== false : true, line: auto?.line ?? res.block.line },
      subnets,
      firewalls,
      ingress,
      peerings,
      externalIps,
    };
  });

  // Anything that names the project's "default" network.
  const defaultNetworkUsers: GcpNetworkTemplateView["defaultNetworkUsers"] = [];
  for (const r of model.resources) {
    if (r.mode !== "resource" || !r.type.startsWith("google_")) continue;
    const blocks = [r.block, ...subBlocks(r.block, "network_interface")];
    for (const b of blocks) {
      const v = b.attrs.network;
      const s = model.str(v?.value);
      if (s && (s === "default" || s.endsWith("/networks/default"))) defaultNetworkUsers.push({ address: r.address, line: v!.line });
    }
  }

  return {
    model,
    buckets,
    settings,
    skipDefaultNetwork: orgPolicy(model, "compute.skipDefaultNetworkCreation"),
    restrictPeering: orgPolicy(model, "compute.restrictVpcPeering"),
    vmExternalIp: orgPolicy(model, "compute.vmExternalIpAccess"),
    projectsWithoutDefaultNetwork: model.ofType("google_project").filter((p) => model.bool(p.block.attrs.auto_create_network?.value) === false),
    defaultNetworkUsers,
  };
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<NetworkView, GcpNetworkTemplateView>();

// CCC.VPC ---------------------------------------------------------------------

const noDefaultNetwork = template((t) => {
  const auto = t.buckets.find((n) => n.autoMode.value);
  if (auto) {
    return fail(
      `${auto.res.address} is an auto mode network (auto_create_subnetworks defaults to true), which creates a subnetwork in every region, just like the default network.`,
      auto.autoMode.line,
    );
  }
  const user = t.defaultNetworkUsers[0];
  if (user) return fail(`${user.address} attaches to the project's "default" network, so it still exists.`, user.line);
  if (t.skipDefaultNetwork) return pass(`${t.skipDefaultNetwork.address} enforces compute.skipDefaultNetworkCreation, so new projects get no default network.`, t.skipDefaultNetwork.line);
  const proj = t.projectsWithoutDefaultNetwork[0];
  if (proj) return pass(`${proj.address} sets auto_create_network = false, so its default network is deleted when the project is created.`, proj.block.attrs.auto_create_network?.line);
  return warn(
    "The networks here are custom mode, but nothing stops projects being created with a default network (which comes with permissive firewall rules). Enforce the compute.skipDefaultNetworkCreation organization policy, or set auto_create_network = false on google_project.",
  );
});

const noPublicIpByDefault = bucket((n, t) => {
  const ext = n.externalIps[0];
  if (ext) return fail(`${ext.address} gives its network interface an external IP (access_config).`, ext.line);
  if (t.vmExternalIp) return pass(`${t.vmExternalIp.address} restricts compute.vmExternalIpAccess, so VMs can't be given external IPs.`, t.vmExternalIp.line);
  return pass("No instance or template in this network declares access_config; Compute Engine only assigns an external IP when asked to.", n.res.block.line);
});

const peeringAllowListed = bucket((n, t) =>
  peeringVerdict(n.peerings, t.restrictPeering, "VPC network", "Enforce the compute.restrictVpcPeering organization policy with an allow-list of networks.", n.res.block.line),
);

const flowLogsCaptureAll = bucket((n) => {
  if (n.autoMode.value) return fail("Auto mode creates its subnetworks without flow logs, and Terraform can't configure them.", n.autoMode.line);
  if (!n.subnets.length) return na("This network has no subnetworks in this template, so it carries no traffic to log.");
  const off = n.subnets.find((s) => !s.log);
  if (off) return fail(`${off.res.address} has no log_config, so VPC Flow Logs are off for it.`, off.res.block.line);
  for (const s of n.subnets) {
    const l = s.log!;
    if (l.sampling < 1) return warn(`${s.res.address} samples ${Math.round(l.sampling * 100)}% of flows (flow_sampling = ${l.sampling}); set 1.0 to capture all of them.`, l.block.line);
    if (l.metadata === "EXCLUDE_ALL_METADATA") return warn(`${s.res.address} excludes flow metadata; use INCLUDE_ALL_METADATA.`, l.block.line);
    if (l.filter && l.filter !== "true") return warn(`${s.res.address} filters flow logs (filter_expr = "${l.filter}"), so some flows aren't recorded.`, l.block.line);
  }
  const which = n.subnets.length === 1 ? n.subnets[0].res.address : `all ${n.subnets.length} subnetworks`;
  return pass(`Flow logs are on for ${which} with flow_sampling = 1.0 and full metadata.`, n.subnets[0].log!.block.line);
});

// CCC.Core --------------------------------------------------------------------

const plaintext = bucket((n) => plaintextBlocked(n.ingress, "firewall rule on this network"));

const adminPorts = bucket((n) =>
  adminPortsClosed(n.ingress, pass("No firewall rule admits SSH, RDP or all ports from the internet; the implied rule denies all other ingress.", n.firewalls[0]?.block.line)),
);

const perimeter = bucket((n) => perimeterIngress(n.ingress, "firewall rule on this network"));

const adminActionsLogged = template(() =>
  pass("Admin Activity audit logs are always written for VPC network, subnetwork, route and firewall changes and can't be turned off; they're kept for 400 days."),
);

const regionTrusted = bucket((n, t) => {
  if (n.autoMode.value) return fail("VPC networks are global, and auto mode gives this one a subnetwork in every region, including ones outside the trusted list.", n.autoMode.line);
  if (!n.subnets.length) return na("VPC networks are global; this one has no subnetworks in this template, so it has no regional presence.");
  const outside = n.subnets.find((s) => s.region && !isTrusted(s.region, t.settings));
  if (outside) return fail(`${outside.res.address} is in ${outside.region}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, outside.regionLine);
  const unknown = n.subnets.find((s) => !s.region);
  if (unknown) return warn(`The region of ${unknown.res.address} is unknown or computed.`, unknown.regionLine);
  const regions = [...new Set(n.subnets.map((s) => s.region))].join(", ");
  return pass(`All subnetworks are in trusted regions (${regions}).`, n.subnets[0].regionLine);
});

const childRegionsTrusted = template((t) =>
  locationsTrusted(t, "google_", "Google Cloud", (r) => {
    const l = gcpLocation(t.model, r);
    if (l === null) return PROVIDER_REGIONAL.has(r.type) ? gcpProviderRegion(t.model) : null;
    return l?.toLowerCase() === "global" ? null : l;
  }),
);

const enumerationLogged = bucket((n, t) => {
  const logged = n.firewalls.filter((f) => subBlocks(f.block, "log_config").length && !t.model.bool(f.block.attrs.disabled?.value));
  const denyAll = logged.find((f) => {
    const dir = (t.model.str(f.block.attrs.direction?.value) ?? "INGRESS").toUpperCase();
    return dir === "INGRESS" && subBlocks(f.block, "deny").some((d) => (t.model.str(d.attrs.protocol?.value) ?? "").toLowerCase() === "all");
  });
  if (denyAll) return pass(`${denyAll.address} denies all other ingress and logs each blocked connection (source, port and time), so scans and probes are recorded.`, denyAll.block.line);
  if (logged.length) {
    return warn(
      `Firewall Rules Logging is on for ${logged[0].address}, but blocked connections are only logged when a deny rule with log_config catches them; the implied deny rule can't be logged.`,
      logged[0].block.line,
    );
  }
  return fail(
    "VPC Flow Logs don't record connections blocked by firewall rules, and no firewall rule here logs them. Add a lowest-priority deny-all ingress rule with log_config.",
    n.res.block.line,
  );
});

const logsSeparated = bucket((n) => {
  const s = n.subnets.find((x) => x.log);
  const fw = n.firewalls.find((f) => subBlocks(f.block, "log_config").length);
  if (!s && !fw) return na("No flow or firewall logs are configured for this network (see CCC.VPC.CN04).");
  return pass(
    "Flow and firewall logs are written to Cloud Logging, outside the network they record; reading them needs Logging IAM permissions, not network access.",
    s?.log?.block.line ?? fw?.block.line,
  );
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const gcp: ProviderRules<NetworkView, GcpNetworkTemplateView> = {
  id: "gcp",
  label: "Google Cloud",
  prefix: "google_",
  noun: { one: "VPC network", many: "VPC networks" },
  build: buildGcpNetworkView,
  rules: {
    // CCC.Core (imported by CCC.VPC). CN07.AR01 (alerting on enumeration) needs Security Command Center or Cloud IDS: live test only.
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
