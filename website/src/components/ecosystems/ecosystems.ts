export interface Ecosystem {
  slug: string;
  title: string;
  logo: string;
}

export const ecosystems: Ecosystem[] = [
  { slug: 'prowler', title: 'Prowler', logo: '/img/ecosystems/prowler.png' },
  { slug: 'privateer', title: 'Privateer', logo: '/img/ecosystems/privateer.png' },
  { slug: 'azure-policy', title: 'Azure Policy', logo: '/img/ecosystems/azure-policy.png' },
  { slug: 'azure-verified-modules', title: 'Azure Verified Modules', logo: '/img/ecosystems/azure-verified-modules.svg' },
  { slug: 'aws-lightning-lane', title: 'AWS Lightning Lane', logo: '/img/ecosystems/aws-lightning-lane.png' },
  { slug: 'gemara', title: 'Gemara', logo: '/img/ecosystems/gemara.svg' },
  { slug: 'grc-store', title: 'GRC.Store', logo: '/img/ecosystems/grc-store.png' },
  { slug: 'github-releases', title: 'GitHub Releases', logo: '/img/ecosystems/github-releases.svg' },
  { slug: 'calmsuite', title: 'CALMSuite', logo: '/img/ecosystems/calmsuite.png' },
];

export function getEcosystem(slug: string): Ecosystem | undefined {
  return ecosystems.find((ecosystem) => ecosystem.slug === slug);
}
