import { SectionItem } from "./sections";

// Prettify a slug segment or compound slug (e.g. "ai-ml" → "AI/ML", "gen-ai" → "Gen AI").
export function prettifySegment(s: string): string {
  const acronyms = new Set(["ai", "ml", "iam", "vpc", "etl", "k8s", "sdk"]);
  const parts = s.split("-");
  if (parts.every((p) => acronyms.has(p))) {
    return parts.map((p) => p.toUpperCase()).join("/");
  }
  return parts
    .map((part) =>
      acronyms.has(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

export interface ServiceEntry {
  path: string;
  label: string;
}

export const CATALOG_TYPES = new Set(["capabilities", "threats", "controls"]);

// Returns the catalog type for an item path: /catalogs/<category>/<service>/<type>/<version>
export function getItemType(itemPath: string): string | null {
  const parts = itemPath.split("/").filter(Boolean);
  if (parts.length < 5) return null;
  return CATALOG_TYPES.has(parts[3]) ? parts[3] : null;
}

// Returns /catalogs/<category>/<service> for an item path.
export function getServicePath(itemPath: string): string | null {
  const parts = itemPath.split("/").filter(Boolean);
  if (parts.length < 5) return null;
  return `/catalogs/${parts[1]}/${parts[2]}`;
}

/**
 * Parse a version tag like "v2026.04", "v2026.04-rc3", or "v2025.04.rc-1" into
 * a comparable tuple [year, month, isRC, rcNumber].
 * Full releases sort after all RCs of the same year.month.
 */
function parseVersion(tag: string): [number, number, boolean, number] {
  const normalized = tag.replace(/^v/, "");
  const match = normalized.match(/^(\d{4})\.(\d{2})(?:-rc(\d+))?$/);
  if (!match) return [0, 0, false, 0];
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const isRC = match[3] !== undefined;
  const rcNum = isRC ? parseInt(match[3], 10) : 0;
  return [year, month, isRC, rcNum];
}

/** Compare two version path strings newest-first. */
export function compareVersionPaths(a: string, b: string): number {
  const tagA = (a.split("/").pop() ?? "");
  const tagB = (b.split("/").pop() ?? "");
  const [yearA, monthA, isRcA, rcA] = parseVersion(tagA);
  const [yearB, monthB, isRcB, rcB] = parseVersion(tagB);
  if (yearA !== yearB) return yearB - yearA;
  if (monthA !== monthB) return monthB - monthA;
  // Full release sorts before RCs (newer)
  if (isRcA !== isRcB) return isRcA ? 1 : -1;
  // Higher RC number is newer
  if (isRcA && isRcB) return rcB - rcA;
  return 0;
}

// Derive unique service paths grouped by category from published release items.
// Published paths follow the pattern /catalogs/<category>/<service>/<type>/<version>.
// Pass typeFilter to restrict to a specific catalog type (capabilities|threats|controls).
export function getServiceGroups(
  items: SectionItem[],
  typeFilter?: string
): Map<string, ServiceEntry[]> {
  const groups = new Map<string, ServiceEntry[]>();
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.path) continue;
    const parts = item.path.split("/").filter(Boolean);
    if (parts.length < 5) continue;
    const [, category, service, type] = parts;
    if (typeFilter && type !== typeFilter) continue;
    const servicePath = `/catalogs/${category}/${service}`;
    if (seen.has(servicePath)) continue;
    seen.add(servicePath);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push({ path: servicePath, label: prettifySegment(service) });
  }

  return groups;
}
