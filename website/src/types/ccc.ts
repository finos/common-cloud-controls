// Core Types
export interface ControlMappings {
    [key: string]: string[];
}

export interface TestRequirement {
    id: string;
    text: string;
    tlp_levels: string[];
}

export interface ReleaseManager extends Contributor {
    summary: string;
}

export interface Contributor {
    name: string;
    github_id: string;
    company: string;
}

export interface ReleaseDetails {
    version: string;
    assurance_level: string | null;
    threat_model_url: string | null;
    threat_model_author: string | null;
    red_team: string | null;
    red_team_exercise_url: string | null;
    release_manager: ReleaseManager;
    change_log: string[];
    contributors: Contributor[];
}

export interface Metadata {
    title: string;
    id: string;
    description: string;
    release_details: ReleaseDetails[];
}

export interface Release {
    metadata: Metadata;
    controls: Control[];
    threats: Threat[];
    features: Feature[];
    slug: string;
}

// Feature Types
export interface Feature {
    id: string;
    title: string;
    description: string;
    slug: string;
    threats: Threat[];
    related_threats?: Threat[];
}

// Threat Types
export interface Threat {
    id: string;
    title: string;
    description: string;
    features: string[];
    mitre_technique: string[];
    slug: string;
    related_controls?: Control[];
    related_features?: Feature[];
}

export interface Control {
    id: string;
    title: string;
    objective: string;
    control_family: string;
    threats: string[];
    related_threats?: Threat[];
    nist_csf?: string;
    control_mappings?: ControlMappings;
    test_requirements?: TestRequirement[];
    slug?: string;
}

export interface Component {
    title: string;
    releases: Release[];
    slug?: string;
}


// Page details

interface PageData {
    releaseTitle: string;
    releaseSlug: string;
}

export interface ThreatPageData extends PageData {
    threat: Threat;
}

export interface FeaturePageData extends PageData {
    feature: Feature;
}

export interface ControlPageData extends PageData {
    control: Control;
}

export interface ReleasePageData extends PageData {
    release: Release;
}

export interface ComponentPageData extends PageData {
    component: Component;
}

export interface HomePageData {
    components: Component[];
}
