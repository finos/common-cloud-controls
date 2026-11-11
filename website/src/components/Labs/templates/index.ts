import type { CloudId, LabsTemplate } from "../types";
import { AWS_EXAMPLES } from "./aws";
import { AZURE_EXAMPLES } from "./azure";
import { GCP_EXAMPLES } from "./gcp";

/** One cloud's variant of an example, before it's turned into a LabsTemplate. */
export interface ExampleSource {
  example: string;
  description: string;
  code: string;
}

export const CLOUDS: { id: CloudId; label: string; service: string }[] = [
  { id: "aws", label: "AWS", service: "Amazon S3" },
  { id: "azure", label: "Azure", service: "Azure Blob Storage" },
  { id: "gcp", label: "Google Cloud", service: "Cloud Storage" },
];

/**
 * Each example has a variant for every cloud, so switching cloud keeps the same scenario.
 * The CCC integration fixtures ("fixture") are added at build time by src/plugin/labs.
 */
export const EXAMPLES: { id: string; title: string }[] = [
  { id: "minimal", title: "Minimal bucket" },
  { id: "hardened", title: "Hardened bucket" },
  { id: "public", title: "Public website (anti-pattern)" },
  { id: "replicated", title: "Cross-region replication" },
  { id: "datalake", title: "Data lake (several buckets)" },
  { id: "fixture", title: "CCC integration fixture" },
];

const SOURCES: Record<CloudId, ExampleSource[]> = { aws: AWS_EXAMPLES, azure: AZURE_EXAMPLES, gcp: GCP_EXAMPLES };

export const BUILT_IN_TEMPLATES: LabsTemplate[] = CLOUDS.flatMap(({ id: cloud }) =>
  SOURCES[cloud].map((s) => ({
    id: `${cloud}-${s.example}`,
    cloud,
    example: s.example,
    title: EXAMPLES.find((e) => e.id === s.example)?.title ?? s.example,
    description: s.description,
    code: s.code,
  })),
);
