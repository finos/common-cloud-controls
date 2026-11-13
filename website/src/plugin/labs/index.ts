import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import type { LoadContext, Plugin } from "@docusaurus/types";
import type { CloudId, LabsControl, LabsData, LabsService, LabsTemplate, ServiceId } from "../../components/Labs/types";

/**
 * Builds the data for the /labs playground straight from the catalog source in
 * this repository (not the downloaded releases), so the page always reflects
 * the controls on the current branch.
 */

const GITHUB_BLOB = "https://github.com/finos/common-cloud-controls/blob/main/";

const CORE_CATALOG = "catalogs/core/core";
const FEATURE_ROOT = "modules/features";
const FIXTURE_ROOT = "modules/cloud-api-test/terraform";

/** The services the playground covers. Service ids match the test-fixture module folders. */
const SERVICES: { id: ServiceId; catalog: string; features?: string; fixtureModules: string[] }[] = [
  { id: "object-storage", catalog: "catalogs/storage/object", features: "object-storage", fixtureModules: ["object-storage", "logging"] },
  { id: "secrets", catalog: "catalogs/crypto/secrets", features: "secrets", fixtureModules: ["secrets"] },
  { id: "vpc", catalog: "catalogs/networking/vpc", features: "vpc", fixtureModules: ["vpc"] },
  // The logging fixture records activity on the object-storage fixture, so it's shown with it.
  { id: "logging", catalog: "catalogs/management/logging", fixtureModules: ["object-storage", "logging"] },
  { id: "serverless-computing", catalog: "catalogs/compute/serverless-computing", features: "serverless-computing", fixtureModules: ["serverless-computing"] },
  { id: "virtual-machines", catalog: "catalogs/compute/virtual-machines", features: "virtual-machines", fixtureModules: ["virtual-machines"] },
];

const CLOUD_IDS: CloudId[] = ["aws", "azure", "gcp"];

const PROVIDER_BLOCKS: Record<CloudId, string> = {
  aws: `provider "aws" {
  region = var.region
}
`,
  azure: `provider "azurerm" {
  features {}
}
`,
  gcp: `provider "google" {
  project = var.project_id
  region  = var.region
}
`,
};

/** Values the root module passes to the fixture modules (or its own variable defaults). */
const ROOT_VALUES: Record<CloudId, Record<string, string>> = {
  aws: { region: "us-east-1" },
  azure: { location: "westus2", resource_group: "finos-ccc-integration", key_vault_name: "finoscccintkvsec", unauthorized_region: "westeurope" },
  gcp: { region: "us-central1", zone: "us-central1-a", unauthorized_region: "europe-west1" },
};

/** In the root module, these module inputs receive another module's outputs; inline them when both modules are shown. */
const WIRING: Record<CloudId, [RegExp, string][]> = {
  aws: [[/var\.bucket_arn\b/g, "aws_s3_bucket.main.arn"]],
  azure: [[/var\.storage_account_id\b/g, "azurerm_storage_account.main.id"]],
  gcp: [],
};

interface RawRequirement {
  id: string;
  text: string;
  applicability?: string[];
}

interface RawControl {
  id: string;
  group?: string;
  title: string;
  objective?: string;
  "assessment-requirements"?: RawRequirement[];
}

interface RawControlsFile {
  imports?: { "reference-id": string; entries?: { "reference-id": string }[] }[];
  controls?: RawControl[];
}

function readYaml<T>(file: string): T {
  return yaml.load(fs.readFileSync(file, "utf8")) as T;
}

/** Maps "CCC-ObjStor-CN02-AR01" → repo-relative path of its .feature file, for one service. */
function indexFeatures(repoRoot: string, serviceDir: string | undefined): Map<string, string> {
  const index = new Map<string, string>();
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".feature")) {
        const key = entry.name.replace(/\.feature$/, "");
        // Service-specific features are walked first and take precedence over generic ones.
        if (!index.has(key)) index.set(key, path.relative(repoRoot, full).split(path.sep).join("/"));
      }
    }
  };
  [serviceDir, "generic"].forEach((d) => d && walk(path.join(repoRoot, FEATURE_ROOT, d)));
  return index;
}

function toLabsControl(c: RawControl, catalog: string, sourceFile: string, features: Map<string, string>): LabsControl {
  return {
    id: c.id,
    title: c.title,
    objective: (c.objective ?? "").replace(/\s+/g, " ").trim(),
    group: c.group ?? "Other",
    catalog,
    sourceUrl: GITHUB_BLOB + sourceFile,
    requirements: (c["assessment-requirements"] ?? []).map((r) => {
      const feature = features.get(r.id.replace(/\./g, "-"));
      return {
        id: r.id,
        text: r.text.replace(/\s+/g, " ").trim(),
        applicability: r.applicability ?? [],
        featureUrl: feature ? GITHUB_BLOB + feature : undefined,
      };
    }),
  };
}

const sortById = (a: RawControl, b: RawControl) => a.id.localeCompare(b.id, undefined, { numeric: true });
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

function buildService(repoRoot: string, svc: (typeof SERVICES)[number], core: RawControlsFile): LabsService {
  const features = indexFeatures(repoRoot, svc.features);
  const metadata = readYaml<{ metadata: { id: string; title: string; description: string } }>(
    path.join(repoRoot, svc.catalog, "metadata.yaml"),
  ).metadata;
  const serviceFile = `${svc.catalog}/controls.yaml`;
  const coreFile = `${CORE_CATALOG}/controls.yaml`;
  const service = readYaml<RawControlsFile>(path.join(repoRoot, serviceFile));

  const importedIds = new Set((service.imports ?? []).flatMap((i) => (i.entries ?? []).map((e) => e["reference-id"])));
  const coreControls = (core.controls ?? []).filter((c) => importedIds.has(c.id)).sort(sortById);
  const serviceControls = [...(service.controls ?? [])].sort(sortById);

  return {
    id: svc.id,
    catalogId: metadata.id,
    title: metadata.title.replace(/^(FINOS\s+)?(CCC\s+)?/, ""),
    description: tidy(metadata.description),
    controls: [
      ...coreControls.map((c) => toLabsControl(c, "CCC.Core", coreFile, features)),
      ...serviceControls.map((c) => toLabsControl(c, metadata.id, serviceFile, features)),
    ],
  };
}

const fixtureFile = (cloud: CloudId, module: string, file: string) => `${FIXTURE_ROOT}/${cloud}/modules/${module}/${file}`;

/** A variable's literal default in a module's variables.tf, if it has a simple one. */
function moduleDefault(variablesTf: string, name: string): string | undefined {
  const m = new RegExp(`variable\s+"${name}"\s*\{[^}]*?default\s*=\s*("[^"\n]*"|[\w.-]+)`).exec(variablesTf);
  return m?.[1];
}

/**
 * Flattens one cloud's test-fixture modules for a service into a single file. Every module
 * input is declared as a variable, with the value the root module passes in where it's a
 * literal, so the playground can resolve locations; module-to-module wiring is inlined.
 */
function buildFixture(repoRoot: string, svc: (typeof SERVICES)[number], cloud: CloudId): LabsTemplate | undefined {
  const read = (f: string) => {
    const full = path.join(repoRoot, f);
    return fs.existsSync(full) ? fs.readFileSync(full, "utf8").replace(/\r\n?/g, "\n").trim() : undefined;
  };
  const modules = svc.fixtureModules
    .map((m) => ({ file: fixtureFile(cloud, m, "main.tf"), text: read(fixtureFile(cloud, m, "main.tf")), vars: read(fixtureFile(cloud, m, "variables.tf")) ?? "" }))
    .filter((m): m is { file: string; text: string; vars: string } => !!m.text && /^resource\s+"/m.test(m.text));
  // The fixture only belongs to this service if the service's own module declares resources.
  if (!modules.some((m) => m.file === fixtureFile(cloud, svc.id, "main.tf"))) return undefined;

  const parts = modules.map((m) => {
    let text = m.text;
    for (const [re, to] of WIRING[cloud]) text = text.replace(re, to);
    return { ...m, text };
  });
  const names = new Set<string>(cloud === "aws" ? ["region"] : cloud === "gcp" ? ["project_id", "region"] : []);
  for (const p of parts) for (const m of p.text.matchAll(/\bvar\.(\w+)/g)) names.add(m[1]);
  const variables = [...names].map((name) => {
    const value = ROOT_VALUES[cloud][name] !== undefined ? JSON.stringify(ROOT_VALUES[cloud][name]) : parts.map((p) => moduleDefault(p.vars, name)).find(Boolean);
    return value ? `variable "${name}" {\n  default = ${value}\n}\n` : `variable "${name}" {}\n`;
  });

  return {
    id: `${svc.id}/${cloud}-fixture`,
    service: svc.id,
    cloud,
    example: "fixture",
    title: "CCC integration fixture",
    description: `The Terraform the CCC project uses to provision its behavioural-test environment on this cloud (${svc.fixtureModules
      .filter((m) => parts.some((p) => p.file === fixtureFile(cloud, m, "main.tf")))
      .join(" + ")} module${parts.length > 1 ? "s" : ""}). It deliberately includes resources the tests expect to fail.`,
    code: [PROVIDER_BLOCKS[cloud], ...variables, ...parts.map((p) => `# ── ${p.file} ──\n\n${p.text}\n`)].join("\n"),
    sourceUrl: GITHUB_BLOB + `${FIXTURE_ROOT}/${cloud}`,
  };
}

export function buildLabsData(repoRoot: string): LabsData {
  const core = readYaml<RawControlsFile>(path.join(repoRoot, CORE_CATALOG, "controls.yaml"));
  return {
    services: SERVICES.map((svc) => buildService(repoRoot, svc, core)),
    templates: SERVICES.flatMap((svc) => CLOUD_IDS.map((cloud) => buildFixture(repoRoot, svc, cloud))).filter((t): t is LabsTemplate => !!t),
  };
}

export default function pluginLabs(context: LoadContext): Plugin<LabsData> {
  const repoRoot = path.resolve(context.siteDir, "..");
  return {
    name: "labs",

    getPathsToWatch() {
      return [
        path.join(repoRoot, CORE_CATALOG, "controls.yaml"),
        ...SERVICES.map((svc) => path.join(repoRoot, svc.catalog, "*.yaml")),
        ...CLOUD_IDS.map((cloud) => path.join(repoRoot, FIXTURE_ROOT, cloud, "modules", "**", "*.tf")),
      ];
    },

    async loadContent() {
      return buildLabsData(repoRoot);
    },

    async contentLoaded({ content, actions }) {
      const dataPath = await actions.createData("labs.json", JSON.stringify(content));
      actions.addRoute({
        path: "/labs",
        component: "@site/src/components/Labs/index.tsx",
        modules: { data: dataPath },
        exact: true,
      });
    },
  };
}
