import React, { type ReactNode } from "react";
import clsx from "clsx";
import ErrorBoundary from "@docusaurus/ErrorBoundary";
import { PageMetadata, SkipToContentFallbackId, ThemeClassNames } from "@docusaurus/theme-common";
import Breadcrumb from "../../components/Breadcrumb";
import { useKeyboardNavigation } from "@docusaurus/theme-common/internal";
import SkipToContent from "@theme/SkipToContent";
import AnnouncementBar from "@theme/AnnouncementBar";
import Navbar from "@theme/Navbar";
import Footer from "@theme/Footer";
import LayoutProvider from "@theme/Layout/Provider";
import ErrorPageContent from "@theme/ErrorPageContent";
import type { Props } from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import styles from "./styles.module.css";

export default function Layout(props: Props): ReactNode {
  const {
    children,
    noFooter,
    wrapperClassName,
    // Not really layout-related, but kept for convenience/retro-compatibility
    title,
    description,
  } = props;

  useKeyboardNavigation();
  const path = useLocation().pathname;
  const nonBreadcrumbPaths = ["/", "/404"];

  return (
    <LayoutProvider>
      <PageMetadata title={title} description={description} />

      <SkipToContent />

      <AnnouncementBar />

      <div className={styles.pageLayout}>
        <Navbar />
        <main id={SkipToContentFallbackId} className={clsx(ThemeClassNames.wrapper.main, styles.mainWrapper, wrapperClassName)}>
          <ErrorBoundary fallback={(params) => <ErrorPageContent {...params} />}>
            {!nonBreadcrumbPaths.includes(path) && <Breadcrumb />}
            {children}
          </ErrorBoundary>
        </main>
      </div>
      {!noFooter && <Footer />}
    </LayoutProvider>
  );
}
