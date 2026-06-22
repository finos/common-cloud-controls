import { usePluginData } from '@docusaurus/useGlobalData';
import type { CatalogAssessmentRequirementRef, CatalogGlobalData } from '@site/src/plugin/catalog-routes';

/**
 * Hook to access the flat assessment-requirement index exposed by the catalog-routes plugin.
 * Used to cross-link CFI test results to their /catalogs/* control pages.
 */
export function useCatalogAssessmentRequirements(): CatalogAssessmentRequirementRef[] {
    const data = usePluginData('catalog-routes') as CatalogGlobalData | undefined;
    return data?.assessmentRequirements ?? [];
}

/** Builds a requirementId -> ref lookup map for O(1) access. */
export function buildAssessmentRequirementIndex(
    assessmentRequirements: CatalogAssessmentRequirementRef[],
): Map<string, CatalogAssessmentRequirementRef> {
    return new Map(assessmentRequirements.map((ar) => [ar.id, ar]));
}
