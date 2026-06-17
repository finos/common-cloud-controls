import type { Configuration } from "@site/src/types/cfi";

export function configurationSidebarLabel(configuration: Configuration): string {
  const { cfi_details, source_details } = configuration;
  const branch = source_details?.branch;
  if (branch) {
    return `${cfi_details.name} (${branch})`;
  }
  return cfi_details.name || cfi_details.id;
}
