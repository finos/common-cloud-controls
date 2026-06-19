import clsx from 'clsx';
import { getEcosystem } from './ecosystems';
import styles from './styles.module.css';

type EcosystemLogoProps = {
  slug: string;
  className?: string;
};

export default function EcosystemLogo({ slug, className }: EcosystemLogoProps) {
  const ecosystem = getEcosystem(slug);
  if (!ecosystem) {
    return null;
  }

  return (
    <img
      src={ecosystem.logo}
      alt={ecosystem.title}
      className={clsx(styles.logo, className)}
    />
  );
}
