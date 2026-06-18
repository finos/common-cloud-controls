export interface Ecosystem {
  slug: string;
  title: string;
  logo: string;
  screenshot?: string;
  video?: {
    url: string;
    caption?: string;
  };
}

export const ecosystems: Ecosystem[] = [
  {
    slug: 'prowler',
    title: 'Prowler',
    logo: '/img/ecosystems/prowler.png',
    video: {
      url: 'https://www.youtube.com/watch?v=M7dnHNp0WCE',
      caption: 'From CCC To Automated Cloud Detections and Remediations — Pedro Martín & Toni de la Fuente',
    },
  },
  { slug: 'privateer', title: 'Privateer', logo: '/img/ecosystems/privateer.png', screenshot: '/img/ecosystems/screenshots/privateer.png' },
  { slug: 'azure-policy', title: 'Azure Policy', logo: '/img/ecosystems/azure-policy.png', screenshot: '/img/ecosystems/screenshots/azure-policy.png' },
  { slug: 'azure-verified-modules', title: 'Azure Verified Modules', logo: '/img/ecosystems/azure-verified-modules.svg', screenshot: '/img/ecosystems/screenshots/avm.png' },
  { slug: 'aws-lightning-lane', title: 'AWS Lightning Lane', logo: '/img/ecosystems/aws-lightning-lane.png' },
  { slug: 'gemara', title: 'Gemara', logo: '/img/ecosystems/gemara.svg', screenshot: '/img/ecosystems/screenshots/gemara.png' },
  { slug: 'grc-store', title: 'GRC.Store', logo: '/img/ecosystems/grc-store.png', screenshot: '/img/ecosystems/screenshots/grc-store.png' },
  { slug: 'github-releases', title: 'GitHub Releases', logo: '/img/ecosystems/github-releases.svg', screenshot: '/img/ecosystems/screenshots/github-releases.png' },
  { slug: 'calmsuite', title: 'CALMSuite', logo: '/img/ecosystems/calmsuite.png', screenshot: '/img/ecosystems/screenshots/calm.png' },
];

export function getEcosystem(slug: string): Ecosystem | undefined {
  return ecosystems.find((ecosystem) => ecosystem.slug === slug);
}
