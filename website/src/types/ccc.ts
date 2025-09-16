export type TLPLevel = "tlp-clear" | "tlp-green" | "tlp-amber" | "tlp-red";

export interface Reference {
    'reference-id': string;
    strength: number;
}

export interface Mapping {
    'reference-id': string
    entries: Reference[]
}

export interface AssessmentRequirement {
    id: string;
    text: string;
    tlp_levels: TLPLevel[];
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
    version: string;
    'last-modified': string;
    release_details?: ReleaseDetails[];
}

// Feature Types
export interface Capability {
    id: string;
    title: string;
    description: string;
    slug: string;
    related_threats?: Threat[];
}

// Threat Types
export interface Threat {
    id: string;
    title: string;
    description: string;
    capabilities?: Mapping[];
}

export interface Control {
    id: string;
    title: string;
    objective: string;
    threat_mappings: Mapping[];
    guideline_mappings: Mapping[];
    test_requirements: AssessmentRequirement[];
    family: ControlFamily;
}

export interface ControlFamily {
    id: string;
    title: string;
    description: string;
}


/**
 * Maps the entire YAML file containing the ccc-release information.
 */
export interface Release {
    metadata: Metadata;
    controls: Control[];
    threats: Threat[];
    capabilities: Capability[];
}

/**
 * There can be multiple releases for a single component.
 */
export interface Component {
    id: string;
    title: string;
    releases: Release[];
}


// Page details

interface PageData {
    releaseTitle: string;
    releaseSlug: string;
    slug: string;
}

export interface ThreatPageData extends PageData {
    threat: Threat;
    related_capabilities?: Capability[];
    related_controls?: Control[];
}

export interface FeaturePageData extends PageData {
    feature: Capability;
    related_threats?: Threat[];
}

export interface ControlPageData extends PageData {
    control: Control;
    related_threats?: Threat[];
    related_capabilities?: Capability[];
}

export interface ReleasePageData extends PageData {
    release: Release;
    release_details: ReleaseDetails;
}

export interface ComponentPageData extends PageData {
    component: Component;
    related_releases: Release[];
}

export interface HomePageData {
    components: Component[];
}
