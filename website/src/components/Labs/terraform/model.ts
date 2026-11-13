/**
 * Turns a parsed HCL file into a lightweight Terraform model: resources, data
 * sources, providers, variables and locals, plus helpers for resolving simple
 * references and normalising IAM policy documents.
 *
 * This is deliberately NOT a Terraform evaluator. It resolves `var.x` to a
 * variable's default and `local.x` to its literal, follows references between
 * resources by address, and otherwise treats unknown values as unknown.
 */

import { parseHcl, type HclBlock, type HclFile, type HclValue } from "../hcl/parser";

export interface TfResource {
  mode: "resource" | "data";
  type: string;
  name: string;
  address: string; // e.g. aws_s3_bucket.main or data.aws_iam_policy_document.x
  block: HclBlock;
}

export class TfModel {
  readonly resources: TfResource[] = [];
  readonly providers: HclBlock[] = [];
  readonly variables: Record<string, HclValue | undefined> = {};
  readonly locals: Record<string, HclValue> = {};

  constructor(readonly file: HclFile) {
    for (const b of file.blocks) {
      if ((b.type === "resource" || b.type === "data") && b.labels.length >= 2) {
        const [type, name] = b.labels;
        const address = (b.type === "data" ? "data." : "") + `${type}.${name}`;
        this.resources.push({ mode: b.type, type, name, address, block: b });
      } else if (b.type === "provider") {
        this.providers.push(b);
      } else if (b.type === "variable" && b.labels[0]) {
        this.variables[b.labels[0]] = b.attrs.default?.value;
      } else if (b.type === "locals") {
        for (const [k, a] of Object.entries(b.attrs)) this.locals[k] = a.value;
      }
    }
  }

  ofType(type: string, mode: TfResource["mode"] = "resource"): TfResource[] {
    return this.resources.filter((r) => r.type === type && r.mode === mode);
  }

  find(mode: TfResource["mode"], type: string, name: string): TfResource | undefined {
    return this.resources.find((r) => r.mode === mode && r.type === type && r.name === name);
  }

  /** Follows var./local. references (one level at a time, max depth) to a concrete value. */
  resolve(v: HclValue | undefined, depth = 0): HclValue | undefined {
    if (!v || depth > 8) return v;
    if (v.t === "ref") {
      const [head, name] = v.path.split(".");
      if (head === "var" && name in this.variables) return this.resolve(this.variables[name], depth + 1) ?? v;
      if (head === "local" && name in this.locals) return this.resolve(this.locals[name], depth + 1);
    }
    return v;
  }

  str(v: HclValue | undefined): string | undefined {
    const r = this.resolve(v);
    if (!r) return undefined;
    if (r.t === "str") return r.v;
    if (r.t === "num" || r.t === "bool") return String(r.v);
    return undefined;
  }

  bool(v: HclValue | undefined): boolean | undefined {
    const r = this.resolve(v);
    if (!r) return undefined;
    if (r.t === "bool") return r.v;
    if (r.t === "str" && (r.v === "true" || r.v === "false")) return r.v === "true";
    return undefined;
  }

  num(v: HclValue | undefined): number | undefined {
    const r = this.resolve(v);
    if (!r) return undefined;
    if (r.t === "num") return r.v;
    if (r.t === "str" && r.v.trim() !== "" && !Number.isNaN(Number(r.v))) return Number(r.v);
    return undefined;
  }

  strList(v: HclValue | undefined): string[] {
    const r = this.resolve(v);
    if (!r) return [];
    if (r.t === "list") return r.items.map((i) => this.str(i) ?? textOf(i));
    const s = this.str(r);
    return s !== undefined ? [s] : [];
  }

  /** The region of the default (un-aliased) aws provider, if determinable. */
  awsRegion(): { region?: string; line?: number; declared: boolean } {
    const p = this.providers.find((b) => b.labels[0] === "aws" && !b.attrs.alias) ?? this.providers.find((b) => b.labels[0] === "aws");
    if (!p) return { declared: false };
    const a = p.attrs.region;
    return { region: this.str(a?.value), line: a?.line ?? p.line, declared: true };
  }

  /** Region for a resource, honouring an explicit `provider = aws.alias`. */
  regionFor(res: TfResource): string | undefined {
    const p = res.block.attrs.provider?.value;
    if (p?.t === "ref" && p.path.startsWith("aws.")) {
      const alias = p.path.slice(4);
      const block = this.providers.find((b) => b.labels[0] === "aws" && this.str(b.attrs.alias?.value) === alias);
      if (block) return this.str(block.attrs.region?.value);
    }
    // AWS provider v6 supports a per-resource region argument.
    return this.str(res.block.attrs.region?.value) ?? this.awsRegion().region;
  }
}

/** Source text approximation for values that aren't literals. */
export function textOf(v: HclValue): string {
  switch (v.t) {
    case "ref":
      return v.path;
    case "raw":
      return v.text;
    case "call":
      return `${v.name}(…)`;
    case "str":
    case "num":
    case "bool":
      return String(v.v);
    default:
      return v.t;
  }
}

export function subBlocks(b: HclBlock, type: string): HclBlock[] {
  return b.blocks.filter((x) => x.type === type);
}

/** True when `v` (or an interpolation inside it) references `address`. */
export function references(v: HclValue | undefined, address: string): boolean {
  if (!v) return false;
  const hit = (path: string) => path === address || path.startsWith(address + ".") || path.startsWith(address + "[");
  switch (v.t) {
    case "ref":
      return hit(v.path);
    case "str":
      return v.interpolated && new RegExp(`\\$\\{\\s*${escapeRe(address)}[.\\[}\\s]`).test(v.v);
    case "raw":
      return new RegExp(`(^|[^\\w.])${escapeRe(address)}([.\\[]|$)`).test(v.text);
    case "list":
      return v.items.some((i) => references(i, address));
    case "obj":
      return Object.values(v.entries).some((e) => references(e, address));
    case "call":
      return v.args.some((a) => references(a, address));
    default:
      return false;
  }
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── IAM policy normalisation ──────────────────────────────────────────────────

export interface PolicyCondition {
  test: string;
  variable: string;
  values: string[];
}

export interface PolicyStatement {
  effect: "Allow" | "Deny";
  /** "*" means anonymous / everyone. */
  principals: string[];
  actions: string[];
  notActions: string[];
  conditions: PolicyCondition[];
  line: number;
}

export interface ParsedPolicy {
  statements: PolicyStatement[];
  /** Set when the policy exists but its contents couldn't be read statically. */
  opaque?: string;
  line: number;
}

/** Reads a policy expression: data.aws_iam_policy_document.x.json, jsonencode({...}), or a JSON string/heredoc. */
export function readPolicy(model: TfModel, v: HclValue | undefined, line: number): ParsedPolicy {
  const r = model.resolve(v);
  if (!r) return { statements: [], opaque: "no policy value", line };

  if (r.t === "ref") {
    const m = /^data\.aws_iam_policy_document\.([\w-]+)\.json$/.exec(r.path);
    const doc = m && model.find("data", "aws_iam_policy_document", m[1]);
    if (doc) return { statements: fromPolicyDocumentBlock(model, doc.block), line: doc.block.line };
    return { statements: [], opaque: `references ${r.path}, which isn't defined in this template`, line };
  }
  if (r.t === "call" && r.name === "jsonencode" && r.args[0]) {
    return { statements: fromJsonPolicy(hclToJson(model, r.args[0]), r.line), line };
  }
  if (r.t === "str") {
    try {
      return { statements: fromJsonPolicy(JSON.parse(r.v), r.line), line };
    } catch {
      return { statements: [], opaque: "policy string isn't valid JSON", line };
    }
  }
  return { statements: [], opaque: "policy is computed at apply time", line };
}

function fromPolicyDocumentBlock(model: TfModel, doc: HclBlock): PolicyStatement[] {
  return subBlocks(doc, "statement").map((s) => {
    const principals: string[] = [];
    for (const p of subBlocks(s, "principals")) {
      const type = model.str(p.attrs.type?.value) ?? "";
      const ids = model.strList(p.attrs.identifiers?.value);
      for (const id of ids) principals.push(type === "*" || (type === "AWS" && id === "*") || id === "*" ? "*" : id);
    }
    return {
      effect: model.str(s.attrs.effect?.value) === "Deny" ? "Deny" : "Allow",
      principals,
      actions: model.strList(s.attrs.actions?.value),
      notActions: model.strList(s.attrs.not_actions?.value),
      conditions: subBlocks(s, "condition").map((c) => ({
        test: model.str(c.attrs.test?.value) ?? "",
        variable: model.str(c.attrs.variable?.value) ?? "",
        values: model.strList(c.attrs.values?.value),
      })),
      line: s.line,
    };
  });
}

function hclToJson(model: TfModel, v: HclValue): unknown {
  const r = model.resolve(v) ?? v;
  switch (r.t) {
    case "list":
      return r.items.map((i) => hclToJson(model, i));
    case "obj":
      return Object.fromEntries(Object.entries(r.entries).map(([k, e]) => [k, hclToJson(model, e)]));
    case "str":
    case "num":
    case "bool":
      return r.v;
    case "null":
      return null;
    default:
      return `\${${textOf(r)}}`;
  }
}

const asArray = (x: unknown): unknown[] => (Array.isArray(x) ? x : x === undefined || x === null ? [] : [x]);

function fromJsonPolicy(json: unknown, line: number): PolicyStatement[] {
  const obj = (json ?? {}) as Record<string, unknown>;
  return asArray(obj.Statement).map((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const principals: string[] = [];
    const p = s.Principal;
    if (p === "*") principals.push("*");
    else if (p && typeof p === "object") {
      for (const ids of Object.values(p as Record<string, unknown>)) {
        for (const id of asArray(ids)) principals.push(String(id));
      }
    }
    const conditions: PolicyCondition[] = [];
    for (const [test, vars] of Object.entries((s.Condition ?? {}) as Record<string, Record<string, unknown>>)) {
      for (const [variable, values] of Object.entries(vars ?? {})) {
        conditions.push({ test, variable, values: asArray(values).map(String) });
      }
    }
    return {
      effect: s.Effect === "Deny" ? "Deny" : "Allow",
      principals,
      actions: asArray(s.Action).map(String),
      notActions: asArray(s.NotAction).map(String),
      conditions,
      line,
    };
  });
}

export function loadModel(src: string): TfModel {
  return new TfModel(parseHcl(src));
}
