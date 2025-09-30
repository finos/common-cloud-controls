import { usePluginData } from '@docusaurus/useGlobalData';
import { Release, Control, AssessmentRequirement } from '@site/src/types/ccc';

/**
 * Hook to access CCC global data from the ccc-pages plugin
 */
export function useCCCData() {
    const cccData = usePluginData('ccc-pages') as {
        'ccc-releases': Release[];
        'ccc-components': any[];
        'ccc-release-yaml': any[];
    } | undefined;

    return {
        releases: cccData?.['ccc-releases'] || [],
        components: cccData?.['ccc-components'] || [],
        releaseYaml: cccData?.['ccc-release-yaml'] || []
    };
}

/**
 * Finds an assessment requirement by its ID across all releases
 */
export function findAssessmentRequirement(
    releases: Release[],
    requirementId: string
): { requirement: AssessmentRequirement; control: Control; release: Release } | null {
    for (const release of releases) {
        for (const control of release.controls) {
            const requirement = control.test_requirements.find(req => req.id === requirementId);
            if (requirement) {
                return { requirement, control, release };
            }
        }
    }
    return null;
}

/**
 * Finds all assessment requirements for a list of requirement IDs
 */
export function findAssessmentRequirements(
    releases: Release[],
    requirementIds: string[]
): Array<{ requirement: AssessmentRequirement; control: Control; release: Release }> {
    return requirementIds
        .map(id => findAssessmentRequirement(releases, id))
        .filter(Boolean) as Array<{ requirement: AssessmentRequirement; control: Control; release: Release }>;
}

/**
 * Generates a URL to a control page with an optional anchor to a specific requirement
 */
export function getControlUrl(release: Release, control: Control, requirementId?: string): string {
    const baseUrl = `/ccc/${release.metadata.id}/${release.metadata.version}/${control.id}`;
    return requirementId ? `${baseUrl}#${requirementId}` : baseUrl;
}
