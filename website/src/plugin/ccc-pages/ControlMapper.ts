export function mapToUrl(category: string, id: string): string | undefined {
    switch (category) {
        case "CCM": {
            const domain = id.split("-")[0].toLowerCase();
            return `https://csf.tools/reference/cloud-controls-matrix/v4-0/${domain}/${id.toLowerCase()}/`;
        }
        case "ISO_27001":
            return `https://www.iso.org/standard/27001`;
        case "NIST_800_53": {
            const [domain, digits] = id.split("-");
            return `https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home?element=${domain}-${digits.padStart(2, '0')}`;
        }
        default:
            return undefined;
    }
}
