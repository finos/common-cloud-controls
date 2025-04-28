import { Contributor } from "./ccc";

export enum TestResultType {
    PASS = "pass",
    FAIL = "fail",
    NA = "na",
    ERROR = "error",
}

export interface TestResultItem {
    test_requirement_id: string;
    test_id: string;
    result: TestResultType;
    description: string;
    timestamp: number;
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

export interface Configuration {
    cfi_details: {
        id: string;
        name: string;
        description: string;
        url: string;
        authors: Contributor[];
        provider: string;
    };

    ccc_references: string[];

    terraform: {
        source: string;
        script: string;
    };

    test_results: TestResultEntry[];
    slug: string;
}

export interface HomePageData {
    configurations: Configuration[];
}



export interface ConfigurationPageData {
    configuration: Configuration;
}
