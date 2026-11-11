/**
 * Shared building blocks for the per-cloud rule sets.
 *
 * Each cloud provider module turns the Terraform model into its own view of the
 * storage resources it understands (S3 buckets, Azure storage accounts, GCS
 * buckets) and maps CCC assessment-requirement IDs to rules over that view.
 */

import type { TfModel, TfResource } from "../terraform/model";
import type { CloudId, Evidence, LabsSettings } from "../types";

export interface BaseBucket {
  res: TfResource;
}

export interface BaseView<B extends BaseBucket> {
  model: TfModel;
  buckets: B[];
  settings: LabsSettings;
}

export type Rule<B extends BaseBucket, T extends BaseView<B>> =
  | { scope: "bucket"; check: (b: B, t: T) => Evidence }
  | { scope: "template"; check: (t: T) => Evidence };

export interface ProviderRules<B extends BaseBucket = BaseBucket, T extends BaseView<B> = BaseView<B>> {
  id: CloudId;
  /** Short name shown next to evidence when a template mixes clouds. */
  label: string;
  /** Terraform resource-type prefix for this provider, e.g. "aws_". */
  prefix: string;
  build(model: TfModel, settings: LabsSettings): T;
  rules: Record<string, Rule<B, T>>;
}

export function ruleFactories<B extends BaseBucket, T extends BaseView<B>>() {
  return {
    bucket: (check: (b: B, t: T) => Evidence): Rule<B, T> => ({ scope: "bucket", check }),
    template: (check: (t: T) => Evidence): Rule<B, T> => ({ scope: "template", check }),
  };
}

export const pass = (message: string, line?: number): Evidence => ({ status: "pass", message, line });
export const fail = (message: string, line?: number): Evidence => ({ status: "fail", message, line });
export const warn = (message: string, line?: number): Evidence => ({ status: "warn", message, line });
export const na = (message: string, line?: number): Evidence => ({ status: "na", message, line });

export function first<T>(xs: T[]): T | undefined {
  return xs[0];
}

export function formatSeconds(s: number): string {
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${s}s`;
}

/** Case-insensitive, whitespace-insensitive match against the organisation's trusted locations. */
export function normaliseRegion(r: string): string {
  return r.toLowerCase().replace(/\s+/g, "");
}

export function isTrusted(region: string, settings: LabsSettings): boolean {
  const r = normaliseRegion(region);
  return settings.trustedRegions.some((t) => normaliseRegion(t) === r);
}

export function isApprovedClass(cls: string, settings: LabsSettings): boolean {
  return settings.approvedStorageClasses.some((a) => a.toUpperCase() === cls.toUpperCase());
}

/**
 * Template-wide check that every resource with a location is in a trusted one.
 * `regionOf` returns null for resources that have no location of their own (e.g. IAM bindings)
 * and undefined when the location is unknown or computed.
 */
export function locationsTrusted(
  t: { model: TfModel; settings: LabsSettings },
  prefix: string,
  label: string,
  regionOf: (r: TfResource) => string | null | undefined,
): Evidence {
  const all = t.model.resources.filter((r) => r.mode === "resource" && r.type.startsWith(prefix));
  if (!all.length) return na(`No ${label} resources in this template.`);
  const located = all.filter((r) => regionOf(r) !== null);
  const outside = located.find((r) => {
    const reg = regionOf(r);
    return reg && !isTrusted(reg, t.settings);
  });
  if (outside) return fail(`${outside.address} deploys to ${regionOf(outside)}, outside the trusted list.`, outside.block.line);
  const unknown = located.filter((r) => !regionOf(r));
  if (unknown.length) return warn(`The location of ${unknown.length} ${label} resource(s) is unknown or computed.`, unknown[0].block.line);
  return pass(`All ${label} resources deploy to trusted locations.`);
}
