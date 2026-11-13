import type { CloudId, LabsTemplate, ServiceId } from "../types";
import * as objectStorage from "./object-storage";
import * as secrets from "./secrets";
import * as vpc from "./vpc";
import * as logging from "./logging";
import * as serverless from "./serverless-computing";
import * as vms from "./virtual-machines";

/** One cloud's variant of an example, before it's turned into a LabsTemplate. */
export interface ExampleSource {
  example: string;
  description: string;
  code: string;
}

export const CLOUDS: { id: CloudId; label: string }[] = [
  { id: "aws", label: "AWS" },
  { id: "azure", label: "Azure" },
  { id: "gcp", label: "Google Cloud" },
];

/** The services the playground covers, with the product that implements each on every cloud. */
export const SERVICES: { id: ServiceId; label: string; products: Record<CloudId, string> }[] = [
  { id: "object-storage", label: "Object Storage", products: { aws: "Amazon S3", azure: "Azure Blob Storage", gcp: "Cloud Storage" } },
  { id: "secrets", label: "Secret Management", products: { aws: "AWS Secrets Manager", azure: "Azure Key Vault", gcp: "Secret Manager" } },
  { id: "vpc", label: "Virtual Private Cloud", products: { aws: "Amazon VPC", azure: "Azure Virtual Network", gcp: "VPC network" } },
  { id: "logging", label: "Logging", products: { aws: "CloudTrail & CloudWatch Logs", azure: "Azure Monitor", gcp: "Cloud Logging" } },
  { id: "serverless-computing", label: "Serverless Computing", products: { aws: "AWS Lambda", azure: "Azure Functions", gcp: "Cloud Run functions" } },
  { id: "virtual-machines", label: "Virtual Machines", products: { aws: "Amazon EC2", azure: "Azure Virtual Machines", gcp: "Compute Engine" } },
];

/**
 * Every service has the three hardening levels on every cloud, so switching cloud or
 * service keeps the same level. Some services add scenarios; the CCC integration
 * fixtures ("fixture") are added at build time by src/plugin/labs.
 */
export const EXAMPLES: { id: string; title: string; group: "level" | "scenario" }[] = [
  { id: "basic", title: "Basic", group: "level" },
  { id: "intermediate", title: "Intermediate", group: "level" },
  { id: "hardened", title: "Hardened", group: "level" },
  { id: "public", title: "Public website (anti-pattern)", group: "scenario" },
  { id: "replicated", title: "Cross-region replication", group: "scenario" },
  { id: "datalake", title: "Data lake (several buckets)", group: "scenario" },
  { id: "fixture", title: "CCC integration fixture", group: "scenario" },
];

type CloudExamples = Record<CloudId, ExampleSource[]>;
const asCloud = (m: { EXAMPLES: ExampleSource[] }[]): CloudExamples => ({ aws: m[0].EXAMPLES, azure: m[1].EXAMPLES, gcp: m[2].EXAMPLES });

const SOURCES: Record<ServiceId, CloudExamples> = {
  "object-storage": asCloud([objectStorage.aws, objectStorage.azure, objectStorage.gcp]),
  secrets: asCloud([secrets.aws, secrets.azure, secrets.gcp]),
  vpc: asCloud([vpc.aws, vpc.azure, vpc.gcp]),
  logging: asCloud([logging.aws, logging.azure, logging.gcp]),
  "serverless-computing": asCloud([serverless.aws, serverless.azure, serverless.gcp]),
  "virtual-machines": asCloud([vms.aws, vms.azure, vms.gcp]),
};

export const exampleTitle = (id: string) => EXAMPLES.find((e) => e.id === id)?.title ?? id;

export const BUILT_IN_TEMPLATES: LabsTemplate[] = SERVICES.flatMap(({ id: service }) =>
  CLOUDS.flatMap(({ id: cloud }) =>
    SOURCES[service][cloud].map((s) => ({
      id: `${service}/${cloud}-${s.example}`,
      service,
      cloud,
      example: s.example,
      title: exampleTitle(s.example),
      description: s.description,
      code: s.code,
    })),
  ),
);
