import React, { useState } from "react";
import HomeSection from "../HomeSection";

const ReactPlayer = React.lazy(() => import("react-player/lazy"));

const videos = [
  {
    url: "https://www.finos.org/hubfs/OSFF%202025%20(Open%20Source%20in%20Finance%20Forum)/OSFF%20London%202025/Video/Breakout%20Talks/Mutualizing%20Risk%20and%20Compliance%20in%20the%20Open/Taming%20Multi-Cloud%20Security_%20Progress%20on%20Common%20Cloud%20Controls%20-%20Michael%20Lysaght%20%26%20Sonali%20Mendis.mp4",
    caption: "Taming Multi-Cloud Security: Progress on Common Cloud Controls — Michael Lysaght & Sonali Mendis",
  },
  {
    url: "https://www.finos.org/hubfs/OSFF%202025%20(Open%20Source%20in%20Finance%20Forum)/OSFF%20New%20York%20NYC%202025/OSFF%20NYC%202025%20Videos/The%20Launchpad%20Incubating%20FINOS%20Projects/Before%20You%20Build%2C%20Check%20What%20You%20Have_%20Practical%20Approaches%20To%20Assess%20Compliance%20B...%20Santosh%20Maurya.mp4",
    caption: "Before You Build, Check What You Have: Practical Approaches To Assess Compliance — Santosh Maurya",
  },
  {
    url: "https://www.youtube.com/watch?v=XjBXGHK2a9c",
    caption: "Turn CCC into Real Checks: Multi-Cloud Security with Prowler + AI (OSFF NY Preview)",
  },
  {
    url: "https://youtu.be/8hMRahzwK3k",
    caption: "Damien Burks (Citi) and Gupta Rudra (Krumware) discuss CCC at OSFF New York 2024.",
  },
  {
    url: "https://youtu.be/t0gksHTRTVw",
    caption: "Jared Lambert (Microsoft) talks about the compliance landscape at OSFF New York 2024.",
  },
  {
    url: "https://youtu.be/AoGH_uw5M2Y",
    caption: "Eddie Knight (Sonatype)'s vertical slice demo of CCC at OSFF New York 2023.",
  },
  {
    url: "https://youtu.be/dE6eOYvpauU",
    caption: "Jim Adams (Citi) and others discuss the need for CCC at OSFF New York 2023.",
  },
  {
    url: "https://youtu.be/ITFNeStAebs",
    caption: "Naseer Mohammed (Google) and Simon Zhang (BMO) discuss CCC at OSFF New York 2023.",
  },
  {
    url: "https://youtu.be/cg3I53R59Iw",
    caption: "Kim Prado (BMO)'s keynote session on Cloud Controls at OSFF 2023.",
  },
];

function videoThumbnail(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  return true;
}

function NavButton({ onClick, direction }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={direction === "prev" ? "Previous video" : "Next video"}
      style={{
        background: hovered ? "rgba(0,181,226,0.15)" : "rgba(0, 134, 191, 1)",
        border: "none",
        borderRadius: "50%",
        width: "2.75rem",
        height: "2.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#fff",
        flexShrink: 0,
        transition: "background 0.15s",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          width: "1.1rem",
          height: "1.1rem",
          transform: direction === "prev" ? "rotate(90deg)" : "rotate(-90deg)",
        }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

export default function VideoCarousel() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + videos.length) % videos.length);
  const next = () => setCurrent((c) => (c + 1) % videos.length);

  const v = videos[current];

  return (
    <HomeSection title="Featured Talks">
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <NavButton onClick={prev} direction="prev" />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                position: "relative",
                aspectRatio: "16/9",
                background: "#111",
                borderRadius: "0.75rem",
                overflow: "hidden",
              }}
            >
              <React.Suspense
                fallback={
                  <div style={{ width: "100%", height: "100%", background: "#333" }} />
                }
              >
                <ReactPlayer
                  key={v.url}
                  url={v.url}
                  width="100%"
                  height="100%"
                  controls
                  light={videoThumbnail(v.url)}
                  style={{ position: "absolute", top: 0, left: 0 }}
                />
              </React.Suspense>
            </div>
          </div>

          <NavButton onClick={next} direction="next" />
        </div>

        <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <p
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.5,
              color: "var(--gf-color-text-subtle)",
              margin: "0 0 0.75rem",
            }}
          >
            {v.caption}
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to video ${i + 1}`}
                style={{
                  width: i === current ? "1.5rem" : "0.5rem",
                  height: "0.5rem",
                  borderRadius: "999px",
                  background: i === current ? "#00b5e2" : "var(--gf-color-text-subtle)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  opacity: i === current ? 1 : 0.4,
                  transition: "width 0.2s, opacity 0.2s, background 0.2s",
                }}
              />
            ))}
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--gf-color-text-subtle)", margin: 0 }}>
            {current + 1} / {videos.length} — Further videos on the{" "}
            <a
              href="https://www.youtube.com/watch?v=8hMRahzwK3k&list=PLmPXh6nBuhJuWoOHDqG4AMPVerlWYDacD"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube playlist
            </a>
            .
          </p>
        </div>
      </div>
    </HomeSection>
  );
}
