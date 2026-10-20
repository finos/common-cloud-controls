import type { ReactNode } from "react";
import styles from "./styles.module.css";

type PullQuoteProps = {
  children: ReactNode;
  attribution: string;
};

export default function PullQuote({ children, attribution }: PullQuoteProps) {
  return (
    <blockquote className={styles.pullQuote}>
      <p>{children}</p>
      <cite>{attribution}</cite>
    </blockquote>
  );
}
