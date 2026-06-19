import clsx from 'clsx';
import { getEcosystem } from './ecosystems';
import styles from './styles.module.css';

type EcosystemScreenshotProps = {
  slug: string;
  className?: string;
};

export default function EcosystemScreenshot({ slug, className }: EcosystemScreenshotProps) {
  const ecosystem = getEcosystem(slug);
  if (!ecosystem?.screenshot) {
    return null;
  }

  return (
    <figure className={clsx(styles.screenshotFigure, className)}>
      <img
        src={ecosystem.screenshot}
        alt={`${ecosystem.title} screenshot`}
        className={styles.screenshot}
      />
    </figure>
  );
}
