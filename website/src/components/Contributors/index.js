import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";

export default function Contributors() {
  return (
    <HomeSection title="Contributors">
      <div style={{ display: "flex", gap: "24px", flexWrap: "nowrap" }}>
        <iframe src="https://insights.linuxfoundation.org/embed/project/fsccc?widget=organizations-leaderboard&startDate=2025-06-16&endDate=2026-06-16&timeRangeKey=past365days&metric=all%3Aall&includeCollaborations=false" width="600" height="476" allowFullScreen loading="lazy" style={{ border: "none", borderRadius: "8px" }} />
        <iframe src="https://insights.linuxfoundation.org/embed/project/fsccc?widget=contributors-leaderboard&startDate=2025-06-17&endDate=2026-06-17&timeRangeKey=past365days&metric=all%3Aall&includeCollaborations=false" width="600" height="476" allowFullScreen loading="lazy" style={{ border: "none", borderRadius: "8px" }} />
      </div>
    </HomeSection>
  );
}
