import React from "react";
import styles from "./styles.module.css";
import MonoIcon from "../MonoIcon";

// left, right panels, a call to action adn a footer icon
export default ({ children, title, id }) => {
  return (
    <section className={styles.homeSection} id={id}>
      <h2 className={styles.sectionTitle}>{title}</h2>

      <div className={styles.sectionContents}>{children}</div>

      <div className={styles.footerImage}>
        <MonoIcon />
      </div>
    </section>
  );
};
