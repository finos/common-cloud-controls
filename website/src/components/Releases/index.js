import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";

export default function Benefits() {
  return (
    <HomeSection title="Releases">
      <p style={{ "textAlign": "center" }}>Common Cloud Controls is starting to release recommendations.  </p>
      <p style={{ "textAlign": "center" }}> See <a href=" https://github.com/finos/common-cloud-controls/releases">The CCC Github Releases Page</a></p>
    </HomeSection >
  );
}
