export type TLPLevel = "tlp-clear" | "tlp-green" | "tlp-amber" | "tlp-red";

export interface Reference {
    'reference-id': string;
    strength: number;
    remarks?: string;
}

export interface Mapping {
    'reference-id': string
    entries: Reference[]
}

export interface AssessmentRequirement {
    id: string;
    text: string;
    applicability: TLPLevel[];
}

export interface ReleaseManager extends Contributor {
    quote: string;
}

export interface Contributor {
    name: string;
    'github-id': string;
    company: string;
}

export interface ReleaseDetails {
    version: string;
    'assurance-level': string | null;
    'threat-model-url': string | null;
    'threat-model-author': string | null;
    'red-team': string | null;
    'red-team-exercise-url': string | null;
    'release-manager': ReleaseManager;
    'change-log': string[];
    'contributors': Contributor[];
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
