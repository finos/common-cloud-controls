import { Contributor } from "./ccc";

export enum TestResultType {
  PASS = "pass",
  FAIL = "fail",
  NA = "na",
  ERROR = "error",
}

export interface TestResultItem {
  id: string;
  test_requirements: string[];
  result: TestResultType;
  name: string;
  message: string;
  test: string;
  timestamp: number;
  further_info_url?: string;
  resources: string[];
  // OCSF-specific fields for CCC compliance mappings
  status_code?: string;
  status_detail?: string;
  resource_name?: string;
  resource_type?: string;
  resource_uid?: string;
  ccc_objects?: string[];
  finding_title?: string;
  finding_uid?: string;
}

export interface TestResultPageData {
  slug: string;
  result_name: string;
  result_path: string;
  releaseTitle: string;
  configuration: Configuration;
  results: TestResultItem[];
  parentSlug: string;
}

export interface TestResultEntry {
  id: string;
  date: string;
  slug: string;
  status: TestResultType;
}

/**
 * Populated from the json file inside the config directory of each test result.
 */
export interface CFIConfigJson {
  id: string;
  provider: string;
  service: string;
  name: string;
  description: string;
  path: string;
  git?: string;
}

/** One row in `website/src/data/cfi-repositories.json`. */
export interface CFIDataRepositoryEntry {
  name: string;
  url: string;
  description: string;
  destination: string;
}

/** From each configuration tree’s `source-details.json` (written by the CFI download script). */
export interface CFISourceDetails {
  branch: string;
  repository_url: string;
  repository_description: string;
  artifact_url: string;
  artifact_created_at: string;
  downloaded_at: string;
}

/**
 * These are downloaded from github actions, and contain the test results for a single configuration.
 * Site route: `/cfi/{results_destination}/{cfi_details.id}` (last segment is the canonical config id).
 */
export interface Configuration {
  cfi_details: CFIConfigJson;
  /** `test-results/<this>/...` folder name (see `cfi-repositories.json` `destination`). */
  results_destination: string;
  /** On-disk directory under `results_destination` (may differ from `cfi_details.id`, e.g. `*-main`). */
  results_config_folder: string;
  results: ConfigurationResult[];
  source_details?: CFISourceDetails;
}

export interface DownloadLink {
  name: string;
  url: string;
  type: string;
}

export interface ConfigurationResult {
  product: string;
  vendor: string;
  version: string;
  test_results: TestResultItem[];
  download_links?: DownloadLink[];
}

export interface CFIResultSummary {
  name: string;
  description: string;
  provider: string;
  date: string;
  repositoryUrl: string;
  passingTests: number;
  failingTests: number;
  totalTests: number;
  configurationSlug: string;
}

export interface HomePageData {
  configurations: Configuration[];
  /** ISO 8601 timestamp when this page data was produced (site build time). */
  generatedAt: string;
}

export interface ConfigurationPageData {
  configuration: Configuration;
  configurationResultSummaries: ConfigurationResultSummary[];
}

export interface ConfigurationResultSummary {
  product: string;
  vendor: string;
  version: string;
  slug: string;
  totalTests: number;
  passingTests: number;
  failingTests: number;
}

export interface ConfigurationResultPageData {
  configuration: Configuration;
  configurationResult: ConfigurationResult;
}

export interface RequirementLink {
  id: string;
  url: string;
  title: string;
}

export interface ControlCatalogSummary {
  catalogId: string;
  catalogUrl: string;
  resources: string[];
  totalTests: number;
  passingTests: number;
  failingTests: number;
  unusedRequirements: Array<RequirementLink>;
  testedRequirements: Array<RequirementLink>;
  missingRequirements: Array<RequirementLink>;
}

export interface ResourceSummary {
  resourceName: string;
  resourceType: string;
  catalogs: string[];
  totalTests: number;
  passingTests: number;
  failingTests: number;
}

export interface TestSummary {
  resourceName: string;
  resourceType: string;
  totalTests: number;
  passingTests: number;
  failingTests: number;
  catalogsTested: string[];
}

export interface TestMappingDetail {
  eventCode: string;
  totalTests: number;
  passingTests: number;
  failingTests: number;
}

export interface TestMappingSummary {
  controlCatalog: string;
  testRequirementId: string;
  mappedTests: TestMappingDetail[];
}
