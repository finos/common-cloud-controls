/**
 * Static rules mapping Google Cloud Secret Manager Terraform configuration to
 * CCC assessment requirements for the CCC.SecMgmt catalog.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * Secret Manager rotation only publishes a Pub/Sub notification on schedule: a
 * subscriber must add the new version and disable the old one, and that code is
 * invisible here. Both global (google_secret_manager_secret) and regional
 * (google_secret_manager_regional_secret) secrets are checked. The authoritative
 * checks are the behavioural tests in modules/features/secrets.
 */

import { references, subBlocks, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { fail, first, isTrusted, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

interface Located<T> {
  value: T;
  line: number;
}

export interface SecretView {
  res: TfResource;
  regional: boolean;
  /** "auto" (Google picks locations), "user" (listed replicas) or "regional" (pinned to one location). */
  replication?: "auto" | "user" | "regional";
  replicationLine: number;
  locations: Located<string | undefined>[];
  rotation?: { seconds?: number; raw?: string; topics: number; line: number };
  /** Versions of this secret declared with enabled = false. */
  disabledVersions: TfResource[];
}

export type TemplateView = BaseView<SecretView>;

/** Parses a protobuf duration string such as "7776000s". */
function durationSeconds(s: string | undefined): number | undefined {
  const m = s && /^(\d+(?:\.\d+)?)s$/.exec(s.trim());
  return m ? Number(m[1]) : undefined;
}

function buildTemplateView(model: TfModel, settings: LabsSettings): TemplateView {
  const make = (res: TfResource, regional: boolean): SecretView => {
    const b = res.block;
    const view: SecretView = { res, regional, replicationLine: b.line, locations: [], disabledVersions: [] };

    if (regional) {
      view.replication = "regional";
      view.replicationLine = b.attrs.location?.line ?? b.line;
      view.locations.push({ value: model.str(b.attrs.location?.value), line: view.replicationLine });
    } else {
      const repl = first(subBlocks(b, "replication"));
      if (repl) {
        view.replicationLine = repl.line;
        const user = first(subBlocks(repl, "user_managed"));
        if (first(subBlocks(repl, "auto")) || model.bool(repl.attrs.automatic?.value)) view.replication = "auto";
        else if (user) {
          view.replication = "user";
          for (const r of subBlocks(user, "replicas")) view.locations.push({ value: model.str(r.attrs.location?.value), line: r.attrs.location?.line ?? r.line });
        }
      }
    }

    const rot = first(subBlocks(b, "rotation"));
    if (rot) {
      const raw = model.str(rot.attrs.rotation_period?.value);
      view.rotation = { seconds: durationSeconds(raw), raw, topics: subBlocks(b, "topics").length, line: rot.attrs.rotation_period?.line ?? rot.line };
    }

    const versionType = regional ? "google_secret_manager_regional_secret_version" : "google_secret_manager_secret_version";
    view.disabledVersions = model
      .ofType(versionType)
      .filter((v) => references(v.block.attrs.secret?.value, res.address) && model.bool(v.block.attrs.enabled?.value) === false);
    return view;
  };

  const buckets = [
    ...model.ofType("google_secret_manager_secret").map((r) => make(r, false)),
    ...model.ofType("google_secret_manager_regional_secret").map((r) => make(r, true)),
  ];
  return { model, buckets, settings };
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket } = ruleFactories<SecretView, TemplateView>();

const rotationEnforced = bucket((s, t) => {
  const max = t.settings.maxSecretRotationDays;
  const r = s.rotation;
  if (!r) {
    const v = first(s.disabledVersions);
    if (v) return warn(`${v.address} is disabled, so that stale version can't be read, but no rotation schedule keeps future versions from going stale.`, v.block.line);
    return fail("No rotation block, so Secret Manager never prompts for a new version and old values stay valid indefinitely.", s.res.block.line);
  }
  if (r.seconds === undefined) return warn(`rotation_period ${r.raw ? `"${r.raw}" isn't a duration in seconds` : "is missing or computed"}, so the interval can't be checked.`, r.line);
  const days = r.seconds / 86400;
  const every = Number.isInteger(days) ? `${days} days` : `${Math.round(days * 10) / 10} days`;
  if (days > max) return fail(`rotation_period is ${every}, above the ${max}-day threshold.`, r.line);
  if (!r.topics) return warn(`rotation_period is ${every}, but no topics block names a Pub/Sub topic to notify, so nothing acts on the schedule.`, r.line);
  return pass(
    `Secret Manager notifies the rotation topic every ${every} (threshold: ${max} days). The subscriber that adds the new version and disables the old one isn't visible here.`,
    r.line,
  );
});

const replicationInTrustedRegions = bucket((s, t) => {
  if (s.replication === "auto") {
    return fail("Automatic replication lets Google store and serve the secret in any region. Use user_managed replicas in trusted locations, or a regional secret.", s.replicationLine);
  }
  if (!s.replication) return warn("No recognised replication policy is declared for this secret.", s.replicationLine);
  if (!s.locations.length) return warn("user_managed replication is declared without any replicas.", s.replicationLine);
  const bad = s.locations.find((l) => l.value && !isTrusted(l.value, t.settings));
  if (bad) return fail(`The secret is stored in ${bad.value}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, bad.line);
  const unknown = s.locations.find((l) => !l.value);
  if (unknown) return warn("A replica location is unknown or computed at apply time.", unknown.line);
  const where = s.locations.map((l) => l.value).join(", ");
  if (s.regional) return pass(`Regional secret pinned to ${where} (trusted); it can only be read through that region's endpoint.`, s.replicationLine);
  return pass(`User-managed replication keeps the secret in trusted locations only (${where}).`, s.replicationLine);
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const gcp: ProviderRules<SecretView, TemplateView> = {
  id: "gcp",
  label: "Google Cloud",
  prefix: "google_",
  noun: { one: "secret", many: "secrets" },
  build: buildTemplateView,
  rules: {
    "CCC.SecMgmt.CN01.AR01": rotationEnforced,
    "CCC.SecMgmt.CN02.AR01": replicationInTrustedRegions,
  },
};
