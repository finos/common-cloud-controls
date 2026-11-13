/**
 * Static rules mapping Amazon VPC Terraform configuration to CCC assessment
 * requirements for the CCC.VPC catalog (and the CCC.Core controls it imports).
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE. They were written for the Labs playground and
 * have not been ratified by the CCC project. They only look at what a Terraform
 * template declares; they cannot see SCPs, default VPCs or security groups
 * created elsewhere, or how traffic actually flows at runtime. The authoritative
 * checks are the behavioural tests in modules/features.
 *
 * Each rule is keyed by assessment-requirement ID. Requirements without a rule
 * are shown as "Live test only" in the UI.
 */

import type { HclBlock } from "../../hcl/parser";
import { readPolicy, references, subBlocks, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { fail, first, isTrusted, locationsTrusted, na, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";
import { ALL_PORTS, adminPortsClosed, describe, peeringVerdict, perimeterIngress, plaintextBlocked, type Ingress, type Peering } from "./network";

// ── Per-VPC view of the template ──────────────────────────────────────────────

interface FlowLog {
  res: TfResource;
  /** Whether the flow log is attached to the whole VPC or only to one of its subnets. */
  scope: "vpc" | "subnet";
  traffic?: string;
  trafficLine: number;
  destination: string;
}

export interface VpcView {
  res: TfResource;
  isDefault: boolean;
  region?: string;
  subnets: TfResource[];
  /** aws_default_security_group for this VPC, if the template manages it. */
  defaultSg?: TfResource;
  ingress: Ingress[];
  flowLogs: FlowLog[];
  peerings: Peering[];
}

export interface AwsVpcTemplateView extends BaseView<VpcView> {
  trails: TfResource[];
  guardDuty: TfResource[];
  /** An attached SCP that denies VPC peering outside an allow-list. */
  peeringGuardrail?: { address: string; line: number };
}

const ALL_PROTOCOLS = new Set(["-1", "all"]);
const PORTLESS = new Set(["icmp", "1", "icmpv6", "58"]);

/** Reads an inline ingress block, an aws_security_group_rule, or an aws_vpc_security_group_ingress_rule. */
function readIngress(model: TfModel, where: string, b: HclBlock, style: "classic" | "vpc"): Ingress {
  const a = b.attrs;
  const protocol = (model.str((style === "vpc" ? a.ip_protocol : a.protocol)?.value) ?? "").toLowerCase();
  const from = model.num(a.from_port?.value);
  const to = model.num(a.to_port?.value);
  const ports = ALL_PROTOCOLS.has(protocol) ? ALL_PORTS : PORTLESS.has(protocol) ? [] : [{ from: from ?? 0, to: to ?? 65535 }];
  const sources =
    style === "vpc"
      ? [model.str(a.cidr_ipv4?.value), model.str(a.cidr_ipv6?.value)].filter((s): s is string => !!s)
      : [...model.strList(a.cidr_blocks?.value), ...model.strList(a.ipv6_cidr_blocks?.value)];
  if (!sources.length) {
    const pl = style === "vpc" ? a.prefix_list_id : a.prefix_list_ids;
    sources.push(pl ? "a managed prefix list" : model.bool(a.self?.value) ? "members of the same security group" : "another security group");
  }
  return { where, ports, sources, line: b.line };
}

/** True when an SCP statement denies creating or accepting VPC peering connections. */
function findPeeringGuardrail(model: TfModel): { address: string; line: number } | undefined {
  for (const pol of model.ofType("aws_organizations_policy")) {
    const type = model.str(pol.block.attrs.type?.value) ?? "SERVICE_CONTROL_POLICY";
    if (type !== "SERVICE_CONTROL_POLICY") continue;
    const policy = readPolicy(model, pol.block.attrs.content?.value, pol.block.line);
    const stmt = policy.statements.find((s) => s.effect === "Deny" && s.actions.some((x) => /vpcpeering/i.test(x)));
    if (!stmt) continue;
    const attached = model.ofType("aws_organizations_policy_attachment").some((at) => references(at.block.attrs.policy_id?.value, pol.address));
    if (attached) return { address: pol.address, line: stmt.line };
  }
  return undefined;
}

export function buildAwsVpcView(model: TfModel, settings: LabsSettings): AwsVpcTemplateView {
  const vpcs = [...model.ofType("aws_vpc"), ...model.ofType("aws_default_vpc")];
  const inTemplate = (v: Parameters<typeof references>[0]) => vpcs.find((x) => references(v, x.address));

  const buckets = vpcs.map((res): VpcView => {
    const isDefault = res.type === "aws_default_vpc";
    const ofVpc = (type: string) => model.ofType(type).filter((r) => references(r.block.attrs.vpc_id?.value, res.address));

    const subnets = [...ofVpc("aws_subnet"), ...(isDefault ? model.ofType("aws_default_subnet") : [])];
    const groups = ofVpc("aws_security_group");
    const defaultSg = first(ofVpc("aws_default_security_group"));

    // Ingress rules from every security group in the VPC, inline or standalone.
    const ingress: Ingress[] = [];
    for (const sg of [...groups, ...(defaultSg ? [defaultSg] : [])]) {
      for (const blk of subBlocks(sg.block, "ingress")) ingress.push(readIngress(model, sg.address, blk, "classic"));
      for (const r of model.ofType("aws_security_group_rule")) {
        if (model.str(r.block.attrs.type?.value) === "ingress" && references(r.block.attrs.security_group_id?.value, sg.address)) {
          ingress.push(readIngress(model, r.address, r.block, "classic"));
        }
      }
      for (const r of model.ofType("aws_vpc_security_group_ingress_rule")) {
        if (references(r.block.attrs.security_group_id?.value, sg.address)) ingress.push(readIngress(model, r.address, r.block, "vpc"));
      }
    }

    // Flow logs on the VPC itself or on one of its subnets.
    const flowLogs: FlowLog[] = [];
    for (const f of model.ofType("aws_flow_log")) {
      const a = f.block.attrs;
      const scope = references(a.vpc_id?.value, res.address) ? "vpc" : subnets.some((s) => references(a.subnet_id?.value, s.address)) ? "subnet" : undefined;
      if (!scope) continue;
      const type = model.str(a.log_destination_type?.value) ?? "cloud-watch-logs";
      const target = a.log_destination?.value ?? a.log_group_name?.value;
      const kind = type === "s3" ? "S3" : type === "kinesis-data-firehose" ? "Kinesis Data Firehose" : "CloudWatch Logs";
      flowLogs.push({
        res: f,
        scope,
        traffic: model.str(a.traffic_type?.value),
        trafficLine: a.traffic_type?.line ?? f.block.line,
        destination: target ? `${kind} (${describe(model, target)})` : kind,
      });
    }

    // Peering connections this VPC takes part in, from either side.
    const peerings: Peering[] = [];
    for (const p of model.ofType("aws_vpc_peering_connection")) {
      const a = p.block.attrs;
      const other = references(a.vpc_id?.value, res.address) ? a.peer_vpc_id : references(a.peer_vpc_id?.value, res.address) ? a.vpc_id : undefined;
      if (!other) continue;
      const peer = inTemplate(other.value);
      const owner = model.str(a.peer_owner_id?.value);
      peerings.push({
        res: p,
        peer: peer?.address,
        external: `${describe(model, other.value)}${owner ? ` in account ${owner}` : ""}`,
        line: other.line,
      });
    }
    // An accepter for a connection requested elsewhere: the accepting VPC is implicit, so only attribute it when there's one VPC.
    if (vpcs.length === 1) {
      for (const acc of model.ofType("aws_vpc_peering_connection_accepter")) {
        const id = acc.block.attrs.vpc_peering_connection_id;
        if (model.ofType("aws_vpc_peering_connection").some((p) => references(id?.value, p.address))) continue;
        peerings.push({ res: acc, external: `the requester of peering connection ${id ? describe(model, id.value) : "(unknown)"}`, line: id?.line ?? acc.block.line });
      }
    }

    return { res, isDefault, region: model.regionFor(res), subnets, defaultSg, ingress, flowLogs, peerings };
  });

  return {
    model,
    buckets,
    settings,
    trails: model.ofType("aws_cloudtrail"),
    guardDuty: model.ofType("aws_guardduty_detector"),
    peeringGuardrail: findPeeringGuardrail(model),
  };
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket, template } = ruleFactories<VpcView, AwsVpcTemplateView>();

// CCC.VPC ---------------------------------------------------------------------

const noDefaultNetwork = template((t) => {
  const d = first(t.model.ofType("aws_default_vpc")) ?? first(t.model.ofType("aws_default_subnet"));
  if (d) return fail(`${d.address} adopts the region's default VPC into Terraform and keeps it. Delete default VPCs rather than managing them.`, d.block.line);
  return warn(
    "AWS creates a default VPC (with public subnets) in every region of a new account, and nothing in this template removes it. Delete default VPCs in your account-vending pipeline and confirm with a live test.",
  );
});

const noPublicIpByDefault = bucket((b, t) => {
  if (!b.subnets.length) return na("No subnets are declared for this VPC.");
  for (const s of b.subnets) {
    const attr = s.block.attrs.map_public_ip_on_launch;
    const on = s.type === "aws_default_subnet" ? t.model.bool(attr?.value) !== false : t.model.bool(attr?.value) === true;
    if (on) return fail(`${s.address} sets map_public_ip_on_launch, so every instance launched in it gets a public IPv4 address.`, attr?.line ?? s.block.line);
  }
  const which = b.subnets.length === 1 ? b.subnets[0].address : `all ${b.subnets.length} subnets`;
  return pass(`map_public_ip_on_launch is off for ${which}, so instances get no public IPv4 address unless one is requested.`, b.subnets[0].block.line);
});

const peeringAllowListed = bucket((b, t) =>
  peeringVerdict(
    b.peerings,
    t.peeringGuardrail,
    "VPC",
    "Attach an SCP that denies ec2:CreateVpcPeeringConnection and ec2:AcceptVpcPeeringConnection outside an allow-list of VPCs.",
    b.res.block.line,
  ),
);

const flowLogsCaptureAll = bucket((b) => {
  const vpcLevel = b.flowLogs.filter((f) => f.scope === "vpc");
  const all = vpcLevel.find((f) => f.traffic === "ALL");
  if (all) return pass(`${all.res.address} captures ALL traffic (accepted and rejected) for every interface in the VPC.`, all.trafficLine);
  const partial = vpcLevel[0];
  if (partial) {
    if (!partial.traffic) return warn(`The traffic_type of ${partial.res.address} is unknown or computed.`, partial.trafficLine);
    return fail(`${partial.res.address} only captures ${partial.traffic} traffic; set traffic_type = "ALL".`, partial.trafficLine);
  }
  const sub = b.flowLogs[0];
  if (sub) return warn(`Only subnet-level flow logs (${sub.res.address}) are configured, so interfaces in other subnets aren't covered.`, sub.res.block.line);
  return fail("No aws_flow_log is attached to this VPC, so traffic to and from its interfaces isn't logged.", b.res.block.line);
});

// CCC.Core --------------------------------------------------------------------

const plaintext = bucket((b) => plaintextBlocked(b.ingress, "security group rule in this VPC"));

const adminPorts = bucket((b) => {
  const sg = b.defaultSg;
  let otherwise;
  if (sg && !subBlocks(sg.block, "ingress").length && !subBlocks(sg.block, "egress").length) {
    otherwise = pass("No security group rule admits SSH, RDP or all ports from the internet, and the default security group has no rules.", sg.block.line);
  } else if (sg) {
    otherwise = warn(`No rule admits SSH or RDP from the internet, but ${sg.address} still has rules. Leave the default security group empty so resources that fall back to it get no access.`, sg.block.line);
  } else {
    otherwise = warn(
      "No rule admits SSH or RDP from the internet, but the VPC's default security group isn't managed here and allows all traffic between resources that use it. Declare aws_default_security_group with no rules.",
      b.res.block.line,
    );
  }
  return adminPortsClosed(b.ingress, otherwise);
});

const perimeter = bucket((b) => perimeterIngress(b.ingress, "security group rule in this VPC"));

const adminActionsLogged = template((t) => {
  if (!t.trails.length) return fail("No aws_cloudtrail resource. VPC configuration changes are only kept for 90 days in Event History without a trail.");
  const tr = t.trails[0];
  if (t.model.bool(tr.block.attrs.enable_logging?.value) === false) return fail("CloudTrail is declared with enable_logging = false.", tr.block.attrs.enable_logging?.line);
  const selectors = subBlocks(tr.block, "event_selector");
  if (selectors.length && selectors.every((s) => t.model.bool(s.attrs.include_management_events?.value) === false)) {
    return fail("CloudTrail event selectors exclude management events, which is where VPC, subnet and security group changes are recorded.", selectors[0].line);
  }
  return pass(`${tr.address} records management events, including every VPC, subnet, route and security group change (who, when, result).`, tr.block.line);
});

const regionTrusted = bucket((b, t) => {
  const { line } = t.model.awsRegion();
  if (!b.region) return warn("The region is unknown or computed at apply time (e.g. from an environment variable).", line ?? b.res.block.line);
  if (isTrusted(b.region, t.settings)) return pass(`Deployed to ${b.region}, which is in the trusted list.`, line);
  return fail(`Deployed to ${b.region}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, line);
});

const childRegionsTrusted = template((t) => locationsTrusted(t, "aws_", "AWS", (r) => t.model.regionFor(r)));

const enumerationAlerted = template((t) => {
  const d = t.guardDuty[0];
  if (!d) return fail("No aws_guardduty_detector. Without GuardDuty nothing raises an alert for port scans or probes against the VPC.");
  if (t.model.bool(d.block.attrs.enable?.value) === false) return fail(`${d.address} is declared with enable = false.`, d.block.attrs.enable?.line);
  return pass(`${d.address} is enabled; GuardDuty raises Recon findings (port probes, port sweeps) and publishes them to EventBridge.`, d.block.line);
});

const enumerationLogged = bucket((b) => {
  const f = b.flowLogs.find((x) => x.traffic === "ALL" || x.traffic === "REJECT");
  if (f) return pass(`${f.res.address} records rejected connection attempts (source address, port and time), which is how port scans and probes show up.`, f.trafficLine);
  if (b.flowLogs.length) return fail(`${b.flowLogs[0].res.address} only records ${b.flowLogs[0].traffic ?? "unknown"} traffic, so rejected probes aren't logged.`, b.flowLogs[0].trafficLine);
  return fail("No VPC flow logs, so rejected connection attempts (e.g. port scans) aren't logged.", b.res.block.line);
});

const logsSeparated = bucket((b) => {
  const f = b.flowLogs[0];
  if (!f) return na("No flow logs are configured for this VPC (see CCC.VPC.CN04).");
  return pass(`Flow logs are delivered to ${f.destination}, outside the VPC they record; reaching them needs IAM permissions, not network access.`, f.res.block.line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const aws: ProviderRules<VpcView, AwsVpcTemplateView> = {
  id: "aws",
  label: "AWS",
  prefix: "aws_",
  noun: { one: "VPC", many: "VPCs" },
  build: buildAwsVpcView,
  rules: {
    // CCC.Core (imported by CCC.VPC)
    "CCC.Core.CN01.AR03": plaintext,
    "CCC.Core.CN04.AR01": adminActionsLogged,
    "CCC.Core.CN05.AR04": perimeter,
    "CCC.Core.CN05.AR06": adminPorts,
    "CCC.Core.CN06.AR01": regionTrusted,
    "CCC.Core.CN06.AR02": childRegionsTrusted,
    "CCC.Core.CN07.AR01": enumerationAlerted,
    "CCC.Core.CN07.AR02": enumerationLogged,
    "CCC.Core.CN09.AR01": logsSeparated,

    // CCC.VPC
    "CCC.VPC.CN01.AR01": noDefaultNetwork,
    "CCC.VPC.CN02.AR01": noPublicIpByDefault,
    "CCC.VPC.CN03.AR01": peeringAllowListed,
    "CCC.VPC.CN04.AR01": flowLogsCaptureAll,
  },
};
