/** Shared types for the Labs playground. Data is produced at build time by src/plugin/labs. */

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
  id: string;
  title: string;
  description: string;
  code: string;
  sourceUrl?: string;
}

export interface LabsData {
  service: { id: string; title: string; description: string };
  controls: LabsControl[];
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
  /** Terraform address of the bucket this evidence is about, when per-bucket. */
  subject?: string;
}

export interface LabsSettings {
  trustedRegions: string[];
  approvedStorageClasses: string[];
  /** Maximum allowed pre-signed URL lifetime in seconds (organisation-defined threshold). */
  maxPresignedUrlSeconds: number;
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
