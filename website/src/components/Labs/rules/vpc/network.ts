/**
 * Helpers shared by the AWS, Azure and Google Cloud rule sets for CCC.VPC:
 * a cloud-neutral shape for inbound firewall rules, and the checks over it
 * (admin ports and plaintext protocols exposed to the internet), plus the
 * common verdict for peering connections.
 *
 * Firewall evaluation is deliberately simple: it looks for Allow rules and
 * ignores rule priorities, so a higher-priority Deny that shadows an Allow is
 * not taken into account.
 */

import type { HclValue } from "../../hcl/parser";
import { textOf, type TfModel, type TfResource } from "../../terraform/model";
import type { Evidence } from "../../types";
import { fail, pass, warn } from "../common";

export interface PortRange {
  from: number;
  to: number;
}

/** One rule that admits inbound traffic, normalised across clouds. */
export interface Ingress {
  /** Address of the security group / NSG / firewall rule that holds it. */
  where: string;
  /** Destination ports admitted; empty for port-less protocols such as ICMP. */
  ports: PortRange[];
  /** Source CIDRs, service tags or a description such as "another security group". */
  sources: string[];
  line: number;
}

export const ALL_PORTS: PortRange[] = [{ from: 0, to: 65535 }];

/** Parses "22", "1000-2000" or "*". */
export function parsePortSpec(spec: string): PortRange | undefined {
  const s = spec.trim();
  if (s === "*") return ALL_PORTS[0];
  const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(s);
  if (!m) return undefined;
  const from = Number(m[1]);
  return { from, to: m[2] ? Number(m[2]) : from };
}

const INTERNET = new Set(["0.0.0.0/0", "::/0", "*", "internet", "any", "0.0.0.0"]);
export const isInternet = (src: string) => INTERNET.has(src.trim().toLowerCase());
const fromInternet = (r: Ingress) => r.sources.some(isInternet);
const allPorts = (r: Ingress) => r.ports.some((p) => p.from <= 1 && p.to >= 65535);
const coversPort = (r: Ingress, port: number) => r.ports.some((p) => p.from <= port && port <= p.to);

const ADMIN_PORTS: [number, string][] = [
  [22, "SSH"],
  [3389, "RDP"],
];
const PLAINTEXT_PORTS: [number, string][] = [
  [80, "HTTP"],
  [21, "FTP"],
  [23, "Telnet"],
];

function describePorts(r: Ingress): string {
  if (allPorts(r)) return "all ports";
  return r.ports.map((p) => (p.from === p.to ? `port ${p.from}` : `ports ${p.from}-${p.to}`)).join(", ");
}

const internetSource = (r: Ingress) => {
  const s = r.sources.find(isInternet);
  return s === "*" ? 'any source ("*")' : (s ?? "anywhere");
};

function firstHit(rules: Ingress[], ports: [number, string][], internet: boolean) {
  for (const r of rules) {
    if (fromInternet(r) !== internet) continue;
    for (const [port, name] of ports) if (coversPort(r, port)) return { rule: r, port, name };
  }
  return undefined;
}

/** Fails when SSH, RDP or every port is reachable from the internet; otherwise returns `otherwise`. */
function adminExposure(rules: Ingress[]): Evidence | undefined {
  const wide = rules.find((r) => fromInternet(r) && allPorts(r));
  if (wide) return fail(`${wide.where} admits all ports (including SSH and RDP) from ${internetSource(wide)}, i.e. the whole internet.`, wide.line);
  const h = firstHit(rules, ADMIN_PORTS, true);
  if (h) return fail(`${h.rule.where} admits ${h.name} (port ${h.port}) from ${internetSource(h.rule)}, so anyone on the internet can attempt to log in.`, h.rule.line);
  return undefined;
}

/** CCC.Core.CN05.AR06: administrative ports must not be open to the internet. */
export function adminPortsClosed(rules: Ingress[], otherwise: Evidence): Evidence {
  return adminExposure(rules) ?? otherwise;
}

/** CCC.Core.CN05.AR04: nothing reachable from outside the trust perimeter without a reason. */
export function perimeterIngress(rules: Ingress[], kind: string): Evidence {
  const admin = adminExposure(rules);
  if (admin) return admin;
  const open = rules.filter((r) => fromInternet(r) && r.ports.length);
  if (open.length) {
    const more = open.length > 1 ? ` (and ${open.length - 1} more rule${open.length > 2 ? "s" : ""})` : "";
    return warn(
      `${open[0].where} admits ${describePorts(open[0])} from ${internetSource(open[0])}${more}. Confirm the service behind it authenticates every request, or narrow the source to a known range.`,
      open[0].line,
    );
  }
  if (!rules.length) return pass(`No ${kind} admits inbound traffic, so nothing is reachable from outside the network.`);
  return pass(`No ${kind} admits traffic from the internet; inbound sources are limited to known ranges.`, rules[0].line);
}

/** CCC.Core.CN01.AR03: plaintext protocols (HTTP, FTP, Telnet) must not be admitted. */
export function plaintextBlocked(rules: Ingress[], kind: string): Evidence {
  const wide = rules.find((r) => fromInternet(r) && allPorts(r));
  if (wide) return fail(`${wide.where} admits all ports from the internet, including plaintext HTTP, FTP and Telnet.`, wide.line);
  const h = firstHit(rules, PLAINTEXT_PORTS, true);
  if (h) return fail(`${h.rule.where} admits ${h.name} (port ${h.port}) from the internet, so unencrypted traffic isn't blocked. Serve HTTPS only, or redirect at a load balancer.`, h.rule.line);
  const i = firstHit(rules, PLAINTEXT_PORTS, false);
  if (i) {
    const what = allPorts(i.rule) ? "all ports (including plaintext HTTP, FTP and Telnet)" : `${i.name} (port ${i.port})`;
    return warn(`${i.rule.where} admits ${what} from ${i.rule.sources.join(", ")}, so unencrypted traffic is allowed inside the network.`, i.rule.line);
  }
  return pass(`No ${kind} admits HTTP, FTP or Telnet.`, rules[0]?.line);
}

// ── Peering ───────────────────────────────────────────────────────────────────

export interface Peering {
  res: TfResource;
  /** Address of the peer network when it's defined in this template. */
  peer?: string;
  /** Description of the peer when it isn't (a literal ID, a variable, ...). */
  external?: string;
  line: number;
}

/**
 * CCC.VPC.CN03.AR01, statically: a peering is only "explicitly allowed" when a
 * guardrail (SCP / Azure Policy / organization policy) restricts peering to an
 * allow-list. Without one, a peering with a network outside the template fails,
 * and the absence of peering (or peering only within the template) is a warning,
 * because nothing prevents a new connection being made with an arbitrary network.
 */
export function peeringVerdict(
  peerings: Peering[],
  guardrail: { address: string; line: number } | undefined,
  noun: string,
  hint: string,
  line: number,
): Evidence {
  if (guardrail) {
    const peers = peerings.map((p) => p.peer ?? p.external).filter(Boolean);
    const now = peers.length ? ` Current peers: ${[...new Set(peers)].join(", ")}.` : "";
    return pass(`${guardrail.address} only allows peering with networks on an explicit allow-list.${now}`, guardrail.line);
  }
  const ext = peerings.find((p) => !p.peer);
  if (ext) return fail(`${ext.res.address} peers with ${ext.external}, which isn't defined in this template, and nothing restricts peering to an allow-list. ${hint}`, ext.line);
  if (peerings.length) {
    const peers = [...new Set(peerings.map((p) => p.peer))].join(", ");
    return warn(`Peers only with ${peers}, defined in this template, but nothing stops further peering connections with arbitrary networks. ${hint}`, peerings[0].line);
  }
  return warn(`No peering connections are declared, but nothing in this template stops one being made with an arbitrary ${noun}. ${hint}`, line);
}

// ── Misc ──────────────────────────────────────────────────────────────────────

/** Every string, key and expression inside a value, joined; used to search policy documents. */
export function flatText(model: TfModel, v: HclValue | undefined, depth = 0): string {
  const r = model.resolve(v);
  if (!r || depth > 20) return "";
  switch (r.t) {
    case "str":
      return r.v;
    case "list":
      return r.items.map((i) => flatText(model, i, depth + 1)).join(" ");
    case "obj":
      return Object.entries(r.entries)
        .map(([k, e]) => `${k} ${flatText(model, e, depth + 1)}`)
        .join(" ");
    case "call":
      return r.args.map((a) => flatText(model, a, depth + 1)).join(" ");
    default:
      return textOf(r);
  }
}

/** Short description of a value for evidence messages: the literal, or the expression. */
export function describe(model: TfModel, v: HclValue | undefined): string {
  if (!v) return "an unknown value";
  const s = model.str(v);
  if (s !== undefined) return `"${s}"`;
  return textOf(v);
}
