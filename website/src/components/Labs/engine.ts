import { HclSyntaxError } from "./hcl/parser";
import { loadModel } from "./terraform/model";
import { PROVIDERS } from "./rules";
import type { CloudId, ControlResult, Evidence, LabsControl, LabsSettings, RequirementResult, Status, Tlp } from "./types";

/** Higher = worse. Used to combine evidence from several buckets. */
const SEVERITY: Record<Status, number> = { na: 0, pass: 1, manual: 2, warn: 3, fail: 4 };

function worst(statuses: Status[]): Status {
  return statuses.reduce<Status>((acc, s) => (SEVERITY[s] > SEVERITY[acc] ? s : acc), "na");
}

export interface EvaluationSummary {
  results: ControlResult[];
  /** Terraform addresses of the storage buckets (or Azure storage accounts) found in the template. */
  bucketAddresses: string[];
  /** Clouds whose resources appear in the template. */
  clouds: CloudId[];
  resourceCount: number;
  counts: Record<Status, number>;
}

export type EvaluationOutcome =
  | { ok: true; summary: EvaluationSummary }
  | { ok: false; error: string; line?: number };

export interface EvaluationOptions {
  /** Data classifications in scope; a requirement applies if it lists any of them. */
  tlps: Tlp[];
  settings: LabsSettings;
  /** Restrict per-bucket rules to this address (e.g. aws_s3_bucket.main or azurerm_storage_account.main). */
  bucket?: string;
}

const LIVE_ONLY = "This requirement depends on runtime behaviour; it can only be verified against a live deployment.";

export function evaluate(src: string, controls: LabsControl[], { tlps, settings, bucket }: EvaluationOptions): EvaluationOutcome {
  let model;
  try {
    model = loadModel(src);
  } catch (e) {
    if (e instanceof HclSyntaxError) return { ok: false, error: e.message, line: e.line };
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Every cloud whose resources appear in the template is checked with its own rule set.
  const active = PROVIDERS.filter((p) => model.resources.some((r) => r.type.startsWith(p.prefix))).map((p) => {
    const view = p.build(model, settings);
    const selected = bucket && view.buckets.some((b) => b.res.address === bucket);
    // When one resource is selected, other clouds' per-bucket rules have nothing in scope.
    const inScope = selected ? view.buckets.filter((b) => b.res.address === bucket) : bucket ? [] : view.buckets;
    return { p, view, inScope, selected };
  });
  const bucketAddresses = active.flatMap((a) => a.view.buckets.map((b) => b.res.address));
  const scoped = bucket && bucketAddresses.includes(bucket) ? active.filter((a) => a.selected) : active;
  const multi = scoped.length > 1;
  const counts: Record<Status, number> = { pass: 0, fail: 0, warn: 0, manual: 0, na: 0 };

  const results: ControlResult[] = [];
  for (const control of controls) {
    const reqs: RequirementResult[] = [];
    for (const requirement of control.requirements) {
      if (!requirement.applicability.some((a) => tlps.includes(a as Tlp))) continue;
      const evidence: Evidence[] = [];
      let automated = false;
      for (const { p, view, inScope } of scoped) {
        const rule = p.rules[requirement.id];
        const subject = multi ? p.label : undefined;
        if (!rule) {
          evidence.push({ status: "manual", subject, message: LIVE_ONLY });
          continue;
        }
        automated = true;
        if (rule.scope === "template") evidence.push({ ...rule.check(view), subject });
        else if (inScope.length) for (const b of inScope) evidence.push({ ...rule.check(b, view), subject: b.res.address });
        else evidence.push({ status: "na", subject, message: `No ${p.label} storage buckets or accounts in this template.` });
      }
      if (!evidence.length) {
        evidence.push(active.length ? { status: "manual", message: LIVE_ONLY } : { status: "na", message: "No AWS, Azure or Google Cloud resources in this template." });
      }
      const status = worst(evidence.map((e) => e.status));
      counts[status]++;
      reqs.push({ requirement, status, evidence, automated });
    }
    if (!reqs.length) continue;
    const automated = reqs.filter((r) => r.automated && r.status !== "na");
    const status = automated.length ? worst(automated.map((r) => r.status)) : reqs.some((r) => r.status === "manual") ? "manual" : "na";
    results.push({ control, status, requirements: reqs });
  }

  return {
    ok: true,
    summary: {
      results,
      bucketAddresses,
      clouds: active.map((a) => a.p.id),
      resourceCount: model.resources.filter((r) => r.mode === "resource").length,
      counts,
    },
  };
}
