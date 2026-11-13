/**
 * Static rules mapping AWS Secrets Manager Terraform configuration to CCC
 * assessment requirements for the CCC.SecMgmt catalog.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * They only look at what a Terraform template declares: they can't see what the
 * rotation Lambda actually does, IAM identity policies, SCPs, or resources
 * created elsewhere. The authoritative checks are the behavioural tests in
 * modules/features/secrets.
 */

import { readPolicy, references, subBlocks, type PolicyStatement, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { fail, first, isTrusted, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

interface Located<T> {
  value: T;
  line: number;
}

export interface SecretView {
  res: TfResource;
  name?: string;
  region: Located<string | undefined>;
  replicas: Located<string | undefined>[];
  rotation?: {
    address: string;
    days?: number;
    /** The raw schedule expression, when one is used instead of automatically_after_days. */
    schedule?: string;
    line: number;
  };
  /** Deny statements in the secret's resource policy that block retrieval of particular versions. */
  versionDenies: PolicyStatement[];
}

export type TemplateView = BaseView<SecretView>;

/** Days between rotations for a Secrets Manager schedule expression, when it is a rate() expression. */
function scheduleDays(expr: string): number | undefined {
  const m = /^rate\(\s*(\d+)\s+(day|days|hour|hours)\s*\)$/i.exec(expr.trim());
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2].toLowerCase().startsWith("hour") ? n / 24 : n;
}

function buildTemplateView(model: TfModel, settings: LabsSettings): TemplateView {
  const providerRegion = model.awsRegion();

  const buckets = model.ofType("aws_secretsmanager_secret").map((res): SecretView => {
    const b = res.block;
    const name = model.str(b.attrs.name?.value);
    const linked = (type: string, attr: string) =>
      model.ofType(type).filter((r) => {
        const v = r.block.attrs[attr]?.value;
        return references(v, res.address) || (name !== undefined && model.str(v) === name);
      });

    const view: SecretView = {
      res,
      name,
      region: { value: model.regionFor(res), line: b.attrs.region?.line ?? providerRegion.line ?? b.line },
      replicas: subBlocks(b, "replica").map((r) => ({ value: model.str(r.attrs.region?.value), line: r.attrs.region?.line ?? r.line })),
      versionDenies: [],
    };

    // Rotation: standalone aws_secretsmanager_secret_rotation, or the legacy inline arguments.
    const rot = first(linked("aws_secretsmanager_secret_rotation", "secret_id"));
    const rules = rot ? first(subBlocks(rot.block, "rotation_rules")) : first(subBlocks(b, "rotation_rules"));
    if (rot || rules) {
      const days = model.num(rules?.attrs.automatically_after_days?.value);
      const schedule = model.str(rules?.attrs.schedule_expression?.value);
      view.rotation = {
        address: rot?.address ?? res.address,
        days: days ?? (schedule ? scheduleDays(schedule) : undefined),
        schedule,
        line: rules?.attrs.automatically_after_days?.line ?? rules?.attrs.schedule_expression?.line ?? rules?.line ?? rot!.block.line,
      };
    }

    // Resource policies that deny retrieving specific (stale) versions.
    const policies = [
      ...linked("aws_secretsmanager_secret_policy", "secret_arn").map((p) => readPolicy(model, p.block.attrs.policy?.value, p.block.line)),
      ...(b.attrs.policy ? [readPolicy(model, b.attrs.policy.value, b.attrs.policy.line)] : []),
    ];
    view.versionDenies = policies
      .flatMap((p) => p.statements)
      .filter((s) => s.effect === "Deny" && s.conditions.some((c) => /^secretsmanager:Version(Id|Stage)$/i.test(c.variable)));

    return view;
  });

  return { model, buckets, settings };
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket } = ruleFactories<SecretView, TemplateView>();

const rotationEnforced = bucket((s, t) => {
  const max = t.settings.maxSecretRotationDays;
  const r = s.rotation;
  const deny = first(s.versionDenies);
  if (!r) {
    if (deny) {
      return warn("A secret policy denies retrieval of specific versions, but nothing rotates the secret automatically. Add an aws_secretsmanager_secret_rotation.", deny.line);
    }
    return fail("No aws_secretsmanager_secret_rotation for this secret, so it is never rotated and old values stay valid indefinitely.", s.res.block.line);
  }
  if (r.days === undefined) {
    if (r.schedule) return warn(`Rotation uses the schedule "${r.schedule}"; check that it rotates at least every ${max} days.`, r.line);
    return warn("Rotation is configured, but its interval is missing or computed at apply time.", r.line);
  }
  const every = Number.isInteger(r.days) ? `${r.days} days` : `${Math.round(r.days * 24)} hours`;
  if (r.days > max) return fail(`${r.address} rotates the secret every ${every}, above the ${max}-day threshold.`, r.line);
  const extra = deny ? " A secret policy also denies retrieval of stale versions." : " After rotation the previous value keeps the AWSPREVIOUS label until the next rotation.";
  return pass(`${r.address} rotates the secret automatically every ${every} (threshold: ${max} days).${extra}`, r.line);
});

const replicationInTrustedRegions = bucket((s, t) => {
  if (!s.region.value) return warn("The secret's region is unknown or computed at apply time (e.g. from an environment variable).", s.region.line);
  if (!isTrusted(s.region.value, t.settings)) {
    return fail(`The secret is stored in ${s.region.value}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, s.region.line);
  }
  const bad = s.replicas.find((r) => r.value && !isTrusted(r.value, t.settings));
  if (bad) return fail(`The secret is replicated to ${bad.value}, outside the trusted list, so it can be retrieved there.`, bad.line);
  const unknown = s.replicas.find((r) => !r.value);
  if (unknown) return warn("A replica's region is unknown or computed at apply time.", unknown.line);
  if (!s.replicas.length) {
    return pass(`The secret exists only in ${s.region.value} (trusted) and has no replicas, so other regions' endpoints can't return it.`, s.region.line);
  }
  return pass(`The secret is stored in ${s.region.value} and replicated only to trusted regions (${s.replicas.map((r) => r.value).join(", ")}).`, s.replicas[0].line);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const aws: ProviderRules<SecretView, TemplateView> = {
  id: "aws",
  label: "AWS",
  prefix: "aws_",
  noun: { one: "secret", many: "secrets" },
  build: buildTemplateView,
  rules: {
    "CCC.SecMgmt.CN01.AR01": rotationEnforced,
    "CCC.SecMgmt.CN02.AR01": replicationInTrustedRegions,
  },
};
