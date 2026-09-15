import { usePluginData } from '@docusaurus/useGlobalData';
import type { CatalogAssessmentRequirementRef, CatalogGlobalData } from '@site/src/plugin/catalog-routes';
import type { CFIGlobalData, ControlConfigurationResultRef } from '@site/src/types/cfi';

/**
 * Hook to access the flat assessment-requirement index exposed by the catalog-routes plugin.
 * Used to cross-link CFI test results to their /catalogs/* control pages.
 */
export function useCatalogAssessmentRequirements(): CatalogAssessmentRequirementRef[] {
    const data = usePluginData('catalog-routes') as CatalogGlobalData | undefined;
    return data?.assessmentRequirements ?? [];
}

/**
 * Hook to access the CFI configuration results that exercised a given control,
 * exposed as global data by the cfi-pages plugin. Used on /catalogs/* control
 * pages to link out to the fixtures that test them.
 */
export function useCfiControlConfigurationResults(controlId: string): ControlConfigurationResultRef[] {
    const data = usePluginData('cfi-pages') as CFIGlobalData | undefined;
    return data?.controlConfigurationResults?.[controlId] ?? [];
}

/** Builds a requirementId -> ref lookup map for O(1) access. */
export function buildAssessmentRequirementIndex(
    assessmentRequirements: CatalogAssessmentRequirementRef[],
): Map<string, CatalogAssessmentRequirementRef> {
    return new Map(assessmentRequirements.map((ar) => [ar.id, ar]));
}
