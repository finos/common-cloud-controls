import React from "react";
import styles from "./index.module.css";

interface MappingCountBadgeProps {
  count: number;
  label?: string;
}

export function MappingCountBadge({ count, label }: MappingCountBadgeProps) {
  const variantClass = count === 0 ? styles.none : count === 1 ? styles.one : styles.many;
  return (
    <span className={`${styles.badge} ${variantClass}`}>
      {label ? `${label}: ${count}` : count}
    </span>
  );
}
