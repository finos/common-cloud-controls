import { HclSyntaxError } from "./hcl/parser";
import { loadModel } from "./terraform/model";
import { buildTemplateView, RULES } from "./rules/objectStorage.aws";
import type { ControlResult, Evidence, LabsControl, LabsSettings, RequirementResult, Status, Tlp } from "./types";

/** Higher = worse. Used to combine evidence from several buckets. */
const SEVERITY: Record<Status, number> = { na: 0, pass: 1, manual: 2, warn: 3, fail: 4 };

function worst(statuses: Status[]): Status {
  return statuses.reduce<Status>((acc, s) => (SEVERITY[s] > SEVERITY[acc] ? s : acc), "na");
}

export interface EvaluationSummary {
  results: ControlResult[];
  /** Terraform addresses of the aws_s3_bucket resources found in the template. */
  bucketAddresses: string[];
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
  /** Restrict per-bucket rules to this bucket address (e.g. aws_s3_bucket.main). */
  bucket?: string;
}

export function evaluate(src: string, controls: LabsControl[], { tlps, settings, bucket }: EvaluationOptions): EvaluationOutcome {
  let model;
  try {
    model = loadModel(src);
  } catch (e) {
    if (e instanceof HclSyntaxError) return { ok: false, error: e.message, line: e.line };
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const view = buildTemplateView(model, settings);
  const bucketAddresses = view.buckets.map((b) => b.res.address);
  const inScope = bucket && bucketAddresses.includes(bucket) ? view.buckets.filter((b) => b.res.address === bucket) : view.buckets;
  const counts: Record<Status, number> = { pass: 0, fail: 0, warn: 0, manual: 0, na: 0 };

  const results: ControlResult[] = [];
  for (const control of controls) {
    const reqs: RequirementResult[] = [];
    for (const requirement of control.requirements) {
      if (!requirement.applicability.some((a) => tlps.includes(a as Tlp))) continue;
      const rule = RULES[requirement.id];
      let evidence: Evidence[];
      if (!rule) {
        evidence = [{ status: "manual", message: "This requirement depends on runtime behaviour; it can only be verified against a live deployment." }];
      } else if (rule.scope === "template") {
        evidence = [rule.check(view)];
      } else if (!inScope.length) {
        evidence = [{ status: "na", message: "No aws_s3_bucket resources in this template." }];
      } else {
        evidence = inScope.map((b) => ({ ...rule.check(b, view), subject: b.res.address }));
      }
      const status = worst(evidence.map((e) => e.status));
      counts[status]++;
      reqs.push({ requirement, status, evidence, automated: !!rule });
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
      resourceCount: model.resources.filter((r) => r.mode === "resource").length,
      counts,
    },
  };
}
