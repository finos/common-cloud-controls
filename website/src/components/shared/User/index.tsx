import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import styles from "./index.module.css";

export interface Contributor {
  name: string;
  "github-id"?: string;
  company?: string;
}

interface UserProps {
  contributor: Contributor;
}

export function User({ contributor }: UserProps) {
  const { name, "github-id": githubId, company } = contributor;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const hasGitHubId = githubId && githubId.trim() !== "";

  return (
    <div className={styles.user}>
      <Avatar>
        {hasGitHubId ? (
          <AvatarImage src={`https://github.com/${githubId}.png`} alt={name} />
        ) : (
          <AvatarFallback style={{ background: "#9ca3af", color: "#fff" }}>{initials}</AvatarFallback>
        )}
      </Avatar>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          {hasGitHubId && (
            <a href={`https://github.com/${githubId}`} target="_blank" rel="noopener noreferrer" className={styles.githubLink}>
              @{githubId}
            </a>
          )}
        </div>
        {company && <span className={styles.companyBadge}>{company}</span>}
      </div>
    </div>
  );
}
