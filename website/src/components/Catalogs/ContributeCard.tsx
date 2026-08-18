import React from "react";
import styles from "./catalog.module.css";

interface Props {
  body?: string;
}

const DEFAULT_BODY =
  "Catalogs are maintained as versioned YAML files. Generated artifacts are published here as each release is cut.";

export const ContributeCard: React.FC<Props> = ({ body = DEFAULT_BODY }) => (
  <div className={styles.surfaceCard}>
    <div className={styles.cardInner}>
      <h2 className={styles.cardTitle}>Contribute to the Next Release</h2>
      <p className={styles.cardProse}>{body}</p>
      <a
        href="https://github.com/finos/common-cloud-controls"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.typeBtn}
      >
        View on GitHub →
      </a>
    </div>
  </div>
);
