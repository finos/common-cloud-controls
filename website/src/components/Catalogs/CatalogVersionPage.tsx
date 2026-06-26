
import React from "react";
import Link from "@docusaurus/Link";
import { CatalogSidebar } from "./CatalogSidebar";
import { prettifySegment } from "@site/src/content/catalogUtils";
import type { CatalogTypeIndexData } from "./CatalogTypeOverviewPage";
import { MappingCountBadge } from "../shared/MappingCountBadge";

export interface CatalogAssessmentRequirement {
  id: string;
  text: string;
  applicability?: string[];
}

export interface CatalogGuidelineMapping {
  framework: string;
  id: string;
  remarks?: string;
  url?: string;
}

export interface CatalogAssessmentRequirement {
  id: string;
  text: string;
  applicability?: string[];
}

export interface CatalogGuidelineMapping {
  framework: string;
  id: string;
  remarks?: string;
  url?: string;
}

export interface CatalogEntry {
  id: string;
  title: string;
  description?: string;
  objective?: string;
  threatMappings?: string[];
  externalMappingsCount?: number;
  capabilityMappingsCount?: number;
  controlMappings?: string[];
  family?: string;
  threatMappingsCount?: number;
  guidelineMappingsCount?: number;
  assessmentRequirementsCount?: number;
  capabilityRefs?: string[];
  threatRefs?: string[];
  assessmentRequirements?: CatalogAssessmentRequirement[];
  guidelineMappings?: CatalogGuidelineMapping[];
  externalMappings?: CatalogGuidelineMapping[];
  remarks? : string;
}

export interface CatalogVersionData {
  title: string;
  type: "capabilities" | "threats" | "controls";
  version: string;
  category: string;
  service: string;
  entries: CatalogEntry[];
  imports: CatalogEntry[];
}

interface Props {
  data: CatalogVersionData;
  typeIndexData?: CatalogTypeIndexData;
}

export const CatalogVersionPage: React.FC<Props> = ({ data, typeIndexData }) => (
  <div className="page-layout">
    <CatalogSidebar typeIndexData={typeIndexData} />
    <article style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: "0 0 0.25rem", color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem" }}>
        {prettifySegment(data.category)} / {prettifySegment(data.service)}
      </p>
      <h1 style={{ marginTop: 0 }}>{data.title}</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-600)", marginBottom: "1.5rem" }}>
        Version: {data.version}
      </p>
      <CatalogTable data={data} />
    </article>
  </div>
);

export const CatalogTable: React.FC<{ data: CatalogVersionData }> = ({ data }) => {
  const valueHeader = data.type === "controls" ? "Objective" : "Description";
  const showThreatMappings = data.type === "capabilities";
  const showThreatColumns = data.type === "threats";
  const showControlColumns = data.type === "controls";
  const sortedEntries = [...data.entries].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const typePath = `/catalogs/${data.category}/${data.service}/${data.type}/${data.version}`;
  return (
    <div className="library-article-body">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>{valueHeader}</th>
            {showThreatMappings && <th>Threat Mappings</th>}
            {showThreatColumns && (
              <>
                <th>External Mappings</th>
                <th>Capability Mappings</th>
                <th>Control Mappings</th>
              </>
            )}
            {showControlColumns && (
              <>
                <th>Control Family</th>
                <th>Threat Mappings</th>
                <th>Guideline Mappings</th>
                <th>Assessment Requirements</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.imports && (<div>neat</div>)}
          {data.imports.map((entry) => (
            
            <tr key={entry.id}>
              <td>
                <Link to={`${typePath}/${entry.id}`}>{entry.id}</Link>
              </td>
              <td>{entry.title}</td>
              <td>{entry.remarks}</td>
              <td>
                Something mayhaps? 
                <MappingCountBadge count={entry.remarks?.length ?? 0} />
              </td>
            </tr>
          ))}
          {data.imports && (<div>less neat</div>)}

          {sortedEntries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <Link to={`${typePath}/${entry.id}`}>{entry.id}</Link>
              </td>
              <td>{entry.title}</td>
              <td>{data.type === "controls" ? entry.objective : entry.description}</td>
              {showThreatMappings && (
                <td>
                  <MappingCountBadge count={entry.threatMappings?.length ?? 0} />
                </td>
              )}
              {showThreatColumns && (
                <>
                  <td>
                    <MappingCountBadge count={entry.externalMappingsCount ?? 0} />
                  </td>
                  <td>
                    <MappingCountBadge count={entry.capabilityMappingsCount ?? 0} />
                  </td>
                  <td>
                    <MappingCountBadge count={entry.controlMappings?.length ?? 0} />
                  </td>
                </>
              )}
              {showControlColumns && (
                <>
                  <td>{entry.family}</td>
                  <td>
                    <MappingCountBadge count={entry.threatMappingsCount ?? 0} />
                  </td>
                  <td>
                    <MappingCountBadge count={entry.guidelineMappingsCount ?? 0} />
                  </td>
                  <td>
                    <MappingCountBadge count={entry.assessmentRequirementsCount ?? 0} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
