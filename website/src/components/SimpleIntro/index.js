import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";
import { Link } from "react-router-dom";

export default function SimpleIntro() {
  return (
    <HomeSection title="">
        <h2>
          Automated Governance is Within Reach.
        </h2>
        <img
          src="/img/diagrams/ccc-diagram.svg"
          alt="CCC architecture diagram"
          style={{
            display: "block",
            margin: "0 auto",
            maxWidth: "100%",
            width: "720px",
            maxHeight: "340px",
            objectFit: "contain",
          }}
        />
        <p className={styles.strap}>
          Technology-agnostic security controls for public and private cloud.
        </p>

        <section >
          <Link
            to="/catalogs"
            className={styles.button}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
          >
          Explore the Catalogs
          </Link>
        </section>
    </HomeSection>
  );
}
