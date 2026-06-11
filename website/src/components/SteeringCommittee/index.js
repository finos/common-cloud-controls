import React from "react";
import HomeSection from "../HomeSection";
import styles from "./styles.module.css";

const members = [
  {
    org: "Citi",
    logo: "/img/firms/Citi.svg",
    cloudLead: "Mohamed Alsaloom",
    cyberLead: "Michael Lysaght",
  },
  {
    org: "LSEG",
    logo: "/img/firms/LSEG.svg",
    cloudLead: "Dean Bryen",
    cyberLead: "Leroy Abhikui",
  },
  {
    org: "Morgan Stanley",
    logo: "/img/firms/MorganStanley.svg",
    cloudLead: "Dave Reeve",
    cyberLead: "Nick Williams",
  },
  {
    org: "ScottLogic",
    logo: "/img/firms/ScottLogic.png",
    cloudLead: "Stevie Shiells",
    cyberLead: "Sonali Mendis",
  },
  {
    org: "Red Hat",
    logo: "/img/firms/RedHat.svg",
    cloudLead: "Aric Rosenbaum",
    cyberLead: "Jenn Power",
  },
  {
    org: "RBC",
    logo: "/img/firms/RBC_Royal_Bank.svg",
    cloudLead: "Ernani Cecon",
    cyberLead: "Maxime Coquerel",
  },
  {
    org: "BlackRock",
    logo: "/img/firms/BlackRock.svg",
    cloudLead: "Eli Hamburger",
    cyberLead: "Praveen Nallasamy, Sankara Ramakrishnan",
  },
];

export default function SteeringCommittee() {
  return (
    <HomeSection title="Steering Committee" id="steering-committee">
      <div className={styles.grid}>
        {members.map((m) => (
          <div key={m.org} className={styles.card}>
            <div className={styles.logoWrapper}>
              {m.logo
                ? <img src={m.logo} alt={m.org} className={styles.logo} />
                : <div className={styles.logoPlaceholder} title={m.org} />
              }
            </div>
            <div className={styles.body}>
              <div className={styles.row}>
                <span className={styles.label}>Cloud Lead</span>
                <span className={styles.name}>{m.cloudLead}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Cyber Security Lead</span>
                <span className={styles.name}>{m.cyberLead}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
