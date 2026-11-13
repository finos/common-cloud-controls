/**
 * Static rules mapping Azure Key Vault secrets (azurerm provider) to CCC
 * assessment requirements for the CCC.SecMgmt catalog.
 *
 * ── Read this before editing ──────────────────────────────────────────────────
 * These mappings are ILLUSTRATIVE and have not been ratified by the CCC project.
 * Key Vault has no built-in rotation for secrets: the usual pattern is an
 * expiration date plus an Event Grid subscription on SecretNearExpiry that
 * triggers a rotation function. Rules can see that wiring, not what the function
 * does, and Key Vault still returns expired or superseded versions when asked by
 * version id. The authoritative checks are the behavioural tests in
 * modules/features/secrets.
 */

import type { HclValue } from "../../hcl/parser";
import { references, type TfModel, type TfResource } from "../../terraform/model";
import type { LabsSettings } from "../../types";
import { azureLocation, fail, isTrusted, normaliseRegion, pass, ruleFactories, warn, type BaseView, type ProviderRules } from "../common";

export interface SecretView {
  res: TfResource;
  /** The vault the secret lives in, when it's declared in this template. */
  vault?: TfResource;
  location?: string;
  locationLine: number;
  expiry?: {
    /** Days from creation (or from each apply) until the secret expires, when determinable. */
    days?: number;
    how: string;
    line: number;
  };
  /** An Event Grid subscription on SecretNearExpiry / SecretExpired for this secret's vault. */
  rotationTrigger?: TfResource;
  /** Such subscriptions exist but couldn't be tied to this secret's vault. */
  unlinkedTrigger?: TfResource;
}

export type TemplateView = BaseView<SecretView>;

/** Azure region pairs: Key Vault replicates its contents to the paired region for disaster recovery. */
const PAIRS: Record<string, string> = {
  uksouth: "ukwest",
  ukwest: "uksouth",
  westeurope: "northeurope",
  northeurope: "westeurope",
  eastus: "westus",
  westus: "eastus",
  eastus2: "centralus",
  centralus: "eastus2",
  westus2: "westcentralus",
  westcentralus: "westus2",
  westus3: "eastus",
  northcentralus: "southcentralus",
  southcentralus: "northcentralus",
  francecentral: "francesouth",
  francesouth: "francecentral",
  germanywestcentral: "germanynorth",
  germanynorth: "germanywestcentral",
  switzerlandnorth: "switzerlandwest",
  switzerlandwest: "switzerlandnorth",
  norwayeast: "norwaywest",
  norwaywest: "norwayeast",
  canadacentral: "canadaeast",
  canadaeast: "canadacentral",
  australiaeast: "australiasoutheast",
  australiasoutheast: "australiaeast",
  japaneast: "japanwest",
  japanwest: "japaneast",
  eastasia: "southeastasia",
  southeastasia: "eastasia",
  centralindia: "southindia",
  southindia: "centralindia",
};

/** Sums a Go duration such as "2160h" or "720h30m" into days. */
function durationDays(s: string): number | undefined {
  const parts = [...s.matchAll(/(\d+(?:\.\d+)?)(h|m|s)/g)];
  if (!parts.length || parts.map((p) => p[0]).join("") !== s.trim()) return undefined;
  const secs = parts.reduce((acc, p) => acc + Number(p[1]) * (p[2] === "h" ? 3600 : p[2] === "m" ? 60 : 1), 0);
  return secs / 86400;
}

const TIME_UNITS: [string, number][] = [
  ["years", 365],
  ["months", 30],
  ["days", 1],
  ["hours", 1 / 24],
  ["minutes", 1 / 1440],
];

/** Reads an expiration_date: timeadd(...), a time_rotating / time_offset resource, or a fixed date. */
function readExpiry(model: TfModel, v: HclValue | undefined, line: number): SecretView["expiry"] {
  const r = model.resolve(v);
  if (!r) return undefined;
  if (r.t === "call" && r.name === "timeadd") {
    const d = model.str(r.args[1]);
    return { days: d ? durationDays(d) : undefined, how: `timeadd(…, "${d ?? "?"}")`, line };
  }
  const path = r.t === "ref" ? r.path : r.t === "str" && r.interpolated ? /\$\{\s*([\w.]+)\s*\}/.exec(r.v)?.[1] : undefined;
  const m = path && /^(time_rotating|time_offset)\.([\w-]+)\./.exec(path);
  if (m) {
    const res = model.find("resource", m[1], m[2]);
    if (!res) return { how: path, line };
    const prefix = m[1] === "time_rotating" ? "rotation_" : "offset_";
    let days = 0;
    let found = false;
    for (const [unit, mult] of TIME_UNITS) {
      const n = model.num(res.block.attrs[prefix + unit]?.value);
      if (n !== undefined) {
        days += n * mult;
        found = true;
      }
    }
    return { days: found ? days : undefined, how: res.address, line };
  }
  if (r.t === "str" && !r.interpolated) return { how: `the fixed date ${r.v}`, line };
  return { how: "a computed value", line };
}

const NEAR_EXPIRY = /^Microsoft\.KeyVault\.(SecretNearExpiry|SecretExpired)$/;

function buildTemplateView(model: TfModel, settings: LabsSettings): TemplateView {
  const vaults = model.ofType("azurerm_key_vault");
  const topics = model.ofType("azurerm_eventgrid_system_topic");
  const subscriptions = [...model.ofType("azurerm_eventgrid_system_topic_event_subscription"), ...model.ofType("azurerm_eventgrid_event_subscription")].filter((s) =>
    model.strList(s.block.attrs.included_event_types?.value).some((e) => NEAR_EXPIRY.test(e)),
  );

  /** True when an event subscription delivers events raised by `vault`. */
  const subscribesTo = (sub: TfResource, vault: TfResource) => {
    const a = sub.block.attrs;
    if (references(a.scope?.value, vault.address)) return true;
    return topics.some(
      (tp) =>
        references(a.system_topic?.value, tp.address) &&
        (references(tp.block.attrs.source_resource_id?.value, vault.address) || references(tp.block.attrs.source_arm_resource_id?.value, vault.address)),
    );
  };

  const buckets = model.ofType("azurerm_key_vault_secret").map((res): SecretView => {
    const b = res.block;
    const vault = vaults.find((v) => references(b.attrs.key_vault_id?.value, v.address));
    const view: SecretView = {
      res,
      vault,
      location: vault ? azureLocation(model, vault.block.attrs.location?.value) : undefined,
      locationLine: vault?.block.attrs.location?.line ?? vault?.block.line ?? b.attrs.key_vault_id?.line ?? b.line,
    };
    const exp = b.attrs.expiration_date;
    if (exp) view.expiry = readExpiry(model, exp.value, exp.line);
    view.rotationTrigger = vault ? subscriptions.find((s) => subscribesTo(s, vault)) : undefined;
    if (!view.rotationTrigger) view.unlinkedTrigger = subscriptions.find((s) => !vaults.some((v) => subscribesTo(s, v)));
    return view;
  });

  return { model, buckets, settings };
}

// ── Rules ─────────────────────────────────────────────────────────────────────

const { bucket } = ruleFactories<SecretView, TemplateView>();

const rotationEnforced = bucket((s, t) => {
  const max = t.settings.maxSecretRotationDays;
  const e = s.expiry;
  if (!e) {
    return fail("The secret has no expiration_date, so nothing marks it as due for rotation and Key Vault never raises SecretNearExpiry for it.", s.res.block.line);
  }
  if (e.days === undefined) {
    return warn(`The secret expires at ${e.how}, so the rotation period can't be determined statically. Derive it from a time_rotating resource instead.`, e.line);
  }
  const period = `${Math.round(e.days * 10) / 10} days`;
  if (e.days > max) return fail(`The secret's expiry (${e.how}) is ${period} out, above the ${max}-day threshold.`, e.line);
  if (s.rotationTrigger) {
    return pass(
      `The secret expires after ${period} (threshold: ${max} days) and ${s.rotationTrigger.address} triggers rotation on SecretNearExpiry. Key Vault still returns old versions by id, so confirm with a live test.`,
      e.line,
    );
  }
  if (s.unlinkedTrigger) {
    return warn(`The secret expires after ${period}, but ${s.unlinkedTrigger.address} couldn't be tied to this secret's vault.`, s.unlinkedTrigger.block.line);
  }
  return warn(
    `The secret expires after ${period}, but nothing rotates it: Key Vault keeps serving expired secrets. Subscribe a rotation function to Microsoft.KeyVault.SecretNearExpiry.`,
    e.line,
  );
});

const vaultLocationTrusted = bucket((s, t) => {
  if (!s.vault) return warn("The secret's key vault isn't declared in this template, so its location can't be checked.", s.locationLine);
  if (!s.location) return warn(`The location of ${s.vault.address} is unknown or computed at apply time.`, s.locationLine);
  if (!isTrusted(s.location, t.settings)) {
    return fail(`${s.vault.address} is in ${s.location}, which isn't in the trusted list (${t.settings.trustedRegions.join(", ") || "empty"}).`, s.locationLine);
  }
  const pair = PAIRS[normaliseRegion(s.location)];
  if (pair && !isTrusted(pair, t.settings)) {
    return warn(`${s.vault.address} is in ${s.location} (trusted), but Key Vault replicates its contents to the paired region ${pair}, which isn't trusted, for disaster recovery.`, s.locationLine);
  }
  return pass(
    `${s.vault.address} is in ${s.location}${pair ? ` and its paired disaster-recovery region ${pair} is also trusted` : ", which is trusted"}. Key Vault secrets aren't replicated anywhere else.`,
    s.locationLine,
  );
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const azure: ProviderRules<SecretView, TemplateView> = {
  id: "azure",
  label: "Azure",
  prefix: "azurerm_",
  noun: { one: "secret", many: "secrets" },
  build: buildTemplateView,
  rules: {
    "CCC.SecMgmt.CN01.AR01": rotationEnforced,
    "CCC.SecMgmt.CN02.AR01": vaultLocationTrusted,
  },
};
