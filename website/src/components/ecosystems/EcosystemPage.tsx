import type { ReactNode } from 'react';
import Layout from '@theme/Layout';
import EcosystemLogo from './EcosystemLogo';
import EcosystemScreenshot from './EcosystemScreenshot';
import EcosystemVideo from './EcosystemVideo';
import styles from './styles.module.css';

type EcosystemPageProps = {
  slug: string;
  title: string;
  children: ReactNode;
};

export default function EcosystemPage({ slug, title, children }: EcosystemPageProps) {
  return (
    <Layout title={title}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageLogoWrapper}>
            <EcosystemLogo slug={slug} className={styles.pageLogo} />
          </div>
        </header>
        <EcosystemVideo slug={slug} />
        <EcosystemScreenshot slug={slug} />
        {children}
      </div>
    </Layout>
  );
}
