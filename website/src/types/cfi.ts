import { Contributor } from "./ccc";

export enum TestResultType {
    PASS = "pass",
    FAIL = "fail",
    NA = "na",
    ERROR = "error",
}

export interface TestResultItem {
    id: string,
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
    parentSlug: string
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

/** 
 * Populated from repository.json file in test-results.
 */
export interface CFIRepository {
    name: string;
    url: string;
    description: string;
    downloaded_at: string;
    artifact_name?: string;
    workflow_run_id?: number;
    workflow_status?: string;
    workflow_conclusion?: string;
}

/**
 * 
 */
export interface Configuration {
    cfi_details: CFIConfigJson;
    repository: CFIRepository;
    slug: string;
    test_results?: TestResultItem[];
    all_ocsf_results?: TestResultItem[];
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
}

export interface ConfigurationPageData {
    configuration: Configuration;
}

export interface ControlCatalogSummary {
    catalogId: string;
    catalogUrl: string;
    resources: string[];
    totalTests: number;
    passingTests: number;
    failingTests: number;
    testedRequirements: Array<{
        id: string;
        url: string;
        title: string;
    }>;
    missingRequirements: Array<{
        id: string;
        url: string;
        title: string;
    }>;
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
