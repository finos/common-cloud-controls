/** Shared types for the Labs playground. Data is produced at build time by src/plugin/labs. */

export type CloudId = "aws" | "azure" | "gcp";

/** CCC services the playground can check, named after their test-fixture folders. */
export type ServiceId = "object-storage" | "secrets" | "vpc" | "logging" | "serverless-computing" | "virtual-machines";

export type Tlp = "tlp-clear" | "tlp-green" | "tlp-amber" | "tlp-red";

export interface LabsRequirement {
  id: string;
  text: string;
  applicability: string[];
  /** GitHub URL of the behavioural Gherkin feature for this requirement, if one exists. */
  featureUrl?: string;
}

export interface LabsControl {
  id: string;
  title: string;
  objective: string;
  group: string;
  /** Catalog the control comes from, e.g. CCC.Core or CCC.ObjStor. */
  catalog: string;
  sourceUrl: string;
  requirements: LabsRequirement[];
}

export interface LabsTemplate {
  /** Unique id, conventionally `<service>/<cloud>-<example>`. */
  id: string;
  service: ServiceId;
  cloud: CloudId;
  /** The example (hardening level or scenario) this template belongs to; each has a variant per cloud. */
  example: string;
  title: string;
  description: string;
  code: string;
  sourceUrl?: string;
}

export interface LabsService {
  id: ServiceId;
  /** Catalog id, e.g. CCC.ObjStor. */
  catalogId: string;
  title: string;
  description: string;
  /** The service's own controls, preceded by the CCC.Core controls its catalog imports. */
  controls: LabsControl[];
}

export interface LabsData {
  services: LabsService[];
  /** Templates generated at build time (the CCC integration fixtures). */
  templates: LabsTemplate[];
}

/**
 * pass    — the template contains configuration that satisfies the requirement
 * fail    — the template is missing it, or contains configuration that violates it
 * warn    — partial evidence, or relies on a provider default the template doesn't pin
 * manual  — can only be verified against a live deployment (behavioural test)
 * na      — doesn't apply to this template (e.g. no replication configured)
 */
export type Status = "pass" | "fail" | "warn" | "manual" | "na";

export interface Evidence {
  status: Status;
  message: string;
  /** 1-based line in the editor the evidence points at. */
  line?: number;
  /** Terraform address of the primary resource this evidence is about, or the cloud for template-wide checks. */
  subject?: string;
}

export interface LabsSettings {
  trustedRegions: string[];
  approvedStorageClasses: string[];
  /** Maximum allowed pre-signed URL lifetime in seconds (organisation-defined threshold). */
  maxPresignedUrlSeconds: number;
  /** Minimum number of days logs must be kept (CCC.Logging.CN02). */
  minLogRetentionDays: number;
  /** Maximum number of days between automatic secret rotations (CCC.SecMgmt.CN01). */
  maxSecretRotationDays: number;
}

export interface RequirementResult {
  requirement: LabsRequirement;
  status: Status;
  evidence: Evidence[];
  /** True when a static rule exists for this requirement. */
  automated: boolean;
}

export interface ControlResult {
  control: LabsControl;
  status: Status;
  requirements: RequirementResult[];
}
