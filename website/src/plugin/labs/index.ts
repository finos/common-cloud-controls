import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import type { LoadContext, Plugin } from "@docusaurus/types";
import type { CloudId, LabsControl, LabsData, LabsTemplate } from "../../components/Labs/types";

/**
 * Builds the data for the /labs playground straight from the catalog source in
 * this repository (not the downloaded releases), so the page always reflects
 * the controls on the current branch.
 */

const GITHUB_BLOB = "https://github.com/finos/common-cloud-controls/blob/main/";

const SERVICE_CATALOG = "catalogs/storage/object";
const CORE_CATALOG = "catalogs/core/core";
const FEATURE_DIRS = ["modules/features/object-storage", "modules/features/generic"];
const FIXTURE_ROOT = "modules/cloud-api-test/terraform";

/**
 * The behavioural-test fixtures for each cloud, flattened into one file. The module
 * inputs are declared as variables (with the root module's defaults) so the
 * playground can resolve locations, and module wiring is inlined where needed.
 */
const FIXTURES: { cloud: CloudId; files: string[]; header: string; rewrite?: [RegExp, string][]; service: string }[] = [
  {
    cloud: "aws",
    service: "object storage + logging modules",
    files: ["modules/object-storage/main.tf", "modules/logging/main.tf"],
    // In the root module, the logging module receives the object-storage bucket's ARN.
    rewrite: [[/var\.bucket_arn\b/g, "aws_s3_bucket.main.arn"]],
    header: `provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-1"
}
`,
  },
  {
    cloud: "azure",
    service: "object storage + logging modules",
    files: ["modules/object-storage/main.tf", "modules/logging/main.tf"],
    header: `provider "azurerm" {
  features {}
}

variable "location" {
  type    = string
  default = "westus2"
}

variable "resource_group" {
  type    = string
  default = "finos-ccc-integration"
}
`,
    // In the root module, the logging module receives the object-storage account's id.
    rewrite: [[/var\.storage_account_id/g,"azurerm_storage_account.main.id"]],
  },
  {
    cloud: "gcp",
    service: "object storage module",
    files: ["modules/object-storage/main.tf"],
    header: `provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}
`,
  },
];

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

/** Maps "CCC-ObjStor-CN02-AR01" → repo-relative path of its .feature file. */
function indexFeatures(repoRoot: string): Map<string, string> {
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
  FEATURE_DIRS.forEach((d) => walk(path.join(repoRoot, d)));
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

export function buildLabsData(repoRoot: string): LabsData {
  const features = indexFeatures(repoRoot);

  const metadata = readYaml<{ metadata: { id: string; title: string; description: string } }>(
    path.join(repoRoot, SERVICE_CATALOG, "metadata.yaml"),
  ).metadata;

  const serviceFile = `${SERVICE_CATALOG}/controls.yaml`;
  const coreFile = `${CORE_CATALOG}/controls.yaml`;
  const service = readYaml<RawControlsFile>(path.join(repoRoot, serviceFile));
  const core = readYaml<RawControlsFile>(path.join(repoRoot, coreFile));

  const importedIds = new Set(
    (service.imports ?? []).flatMap((i) => (i.entries ?? []).map((e) => e["reference-id"])),
  );
  const coreControls = (core.controls ?? [])
    .filter((c) => importedIds.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const serviceControls = [...(service.controls ?? [])].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const controls = [
    ...coreControls.map((c) => toLabsControl(c, "CCC.Core", coreFile, features)),
    ...serviceControls.map((c) => toLabsControl(c, metadata.id, serviceFile, features)),
  ];

  const templates: LabsTemplate[] = [];
  for (const fx of FIXTURES) {
    const parts = fx.files
      .map((f) => `${FIXTURE_ROOT}/${fx.cloud}/${f}`)
      .filter((f) => fs.existsSync(path.join(repoRoot, f)))
      .map((f) => {
        let text = fs.readFileSync(path.join(repoRoot, f), "utf8").replace(/\r\n?/g, "\n").trim();
        for (const [re, to] of fx.rewrite ?? []) text = text.replace(re, to);
        return `# ── ${f} ──\n\n${text}\n`;
      });
    if (!parts.length) continue;
    templates.push({
      id: `${fx.cloud}-fixture`,
      cloud: fx.cloud,
      example: "fixture",
      title: "CCC integration fixture",
      description: `The Terraform the CCC project uses to provision its behavioural-test environment on this cloud (${fx.service}).`,
      code: `${fx.header}\n${parts.join("\n")}`,
      sourceUrl: GITHUB_BLOB + `${FIXTURE_ROOT}/${fx.cloud}`,
    });
  }

  return {
    service: { id: metadata.id, title: metadata.title, description: metadata.description.replace(/\s+/g, " ").trim() },
    controls,
    templates,
  };
}

export default function pluginLabs(context: LoadContext): Plugin<LabsData> {
  const repoRoot = path.resolve(context.siteDir, "..");
  return {
    name: "labs",

    getPathsToWatch() {
      return [
        path.join(repoRoot, SERVICE_CATALOG, "*.yaml"),
        path.join(repoRoot, CORE_CATALOG, "controls.yaml"),
        ...FIXTURES.flatMap((fx) => fx.files.map((f) => path.join(repoRoot, FIXTURE_ROOT, fx.cloud, f))),
      ];
    },

    async loadContent() {
      return buildLabsData(repoRoot);
    },

    async contentLoaded({ content, actions }) {
      const dataPath = await actions.createData("labs-object-storage.json", JSON.stringify(content));
      actions.addRoute({
        path: "/labs",
        component: "@site/src/components/Labs/index.tsx",
        modules: { data: dataPath },
        exact: true,
      });
    },
  };
}
