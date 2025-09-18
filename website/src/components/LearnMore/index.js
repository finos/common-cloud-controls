import React from "react";
import styles from "./styles.module.css";
import HomeSection from "../HomeSection";
import ReactPlayer from "react-player";

export default function LearnMore() {
  return (
    <HomeSection title="Learn More">
      <>
        <div className={styles.videoGrid}>
          <figure className={styles.item}>
            <ReactPlayer width="100%" height="16rem" controls url="https://www.finos.org/hubfs/OSFF%202025%20(Open%20Source%20in%20Finance%20Forum)/OSFF%20London%202025/Video/Breakout%20Talks/Mutualizing%20Risk%20and%20Compliance%20in%20the%20Open/Taming%20Multi-Cloud%20Security_%20Progress%20on%20Common%20Cloud%20Controls%20-%20Michael%20Lysaght%20%26%20Sonali%20Mendis.mp4" />
            <figcaption>Taming Multi-Cloud Security: Progress on Common Cloud Controls - Michael Lysaght &amp; Sonali Mendis</figcaption>
          </figure>
          <figure className={styles.item}>
            <ReactPlayer width="100%" height="16rem" controls url="https://youtu.be/8hMRahzwK3k?si=1cxugQyDrKfZIeEc" />
            <figcaption>Damien Burks (Citi) and Gupta Rudra (Krumware) discuss CCC at OSFF New York in 2024.</figcaption>
          </figure>
          <figure className={styles.item}>
            <ReactPlayer width="100%" height="16rem" controls url="https://youtu.be/t0gksHTRTVw?si=pNt3hgcdVL9wJL8o" />
            <figcaption>Jared Lambert (Microsoft) talks about the compliance landscape at OSFF New York 2024.</figcaption>
          </figure>
          <figure className={styles.item}>
            <ReactPlayer width="100%" height="16rem" controls url="https://youtu.be/AoGH_uw5M2Y?si=rSbF25PYJG8Qmh1Y" />
            <figcaption>Eddie Knight (Sonatype)'s vertical slice demo of CCC / CFI aat OSFF New York 2023.</figcaption>
          </figure>
          <figure className={styles.item}>
            <ReactPlayer width="100%" height="16rem" controls url="https://youtu.be/dE6eOYvpauU?si=rOc2_t-VTfn3xrnd" />
            <figcaption>Jim Adams (Citi) and others discuss the need for CCC at OSFF New York in 2023.</figcaption>
          </figure>
          <figure className={styles.item}>
            <ReactPlayer width="100%" height="16rem" controls url="https://youtu.be/ITFNeStAebs?si=fStMw3pNFWFENK-I" />
            <figcaption>Naseer Mohammed (Google) and Simon Zhang (BMO) discuss CCC at OSFF New York in 2023.</figcaption>
          </figure>
          <figure className={styles.item}>
            <ReactPlayer width="100%" height="16rem" controls url="https://youtu.be/cg3I53R59Iw?si=l6xEJOYZpDxUsTu3" />
            <figcaption>Kim Prado (BMO)'s Keynote session on Cloud Controls at OSFF in 2023.</figcaption>
          </figure>
        </div>
        <p>
          Further videos on the <a href="https://www.youtube.com/watch?v=8hMRahzwK3k&list=PLmPXh6nBuhJuWoOHDqG4AMPVerlWYDacD"> YouTube playlist.</a>
        </p>
      </>
    </HomeSection>
  );
}
