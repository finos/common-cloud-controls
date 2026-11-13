import React from "react";
import styles from "@site/src/components/ecosystems/styles.module.css";

const ReactPlayer = React.lazy(() => import("react-player/lazy"));

type YouTubeEmbedProps = {
  url: string;
  caption?: string;
};

function videoThumbnail(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  return true;
}

export default function YouTubeEmbed({ url, caption }: YouTubeEmbedProps) {
  return (
    <figure className={styles.mediaFigure}>
      <div className={styles.videoContainer}>
        <React.Suspense fallback={<div className={styles.videoFallback} />}>
          <ReactPlayer
            url={url}
            width="100%"
            height="100%"
            controls
            light={videoThumbnail(url)}
            style={{ position: "absolute", top: 0, left: 0 }}
          />
        </React.Suspense>
      </div>
      {caption ? <figcaption className={styles.mediaCaption}>{caption}</figcaption> : null}
    </figure>
  );
}
