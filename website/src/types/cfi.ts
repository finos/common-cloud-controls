import { Contributor } from "./ccc";

export enum TestResultType {
    PASS = "pass",
    FAIL = "fail",
    NA = "na",
    ERROR = "error",
}

export interface TestResultItem {
    id: string,
    test_requirement_id: string;
    result: TestResultType;
    name: string;
    message: string;
    test: string;
    timestamp: number;
    further_info_url?: string;
    resources: string[]
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
    authors: Array<Contributor>;
}

/** 
 * Populated from repository.json file in test-results.
 */
export interface CFIRepository {
    name: string;
    url: string;
    description: string;
    downloaded_at: string;
    artifact_name: string;
}

/**
 * 
 */
export interface Configuration {
    cfi_details: CFIConfigJson;
    test_results: TestResultEntry[];
    cfi_repository: CFIRepository;
    slug: string;
}

export interface HomePageData {
    configurations: Configuration[];
}

export interface ConfigurationPageData {
    configuration: Configuration;
}
