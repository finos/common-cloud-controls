import React from 'react';
import clsx from 'clsx';
import { getEcosystem } from './ecosystems';
import styles from './styles.module.css';

const ReactPlayer = React.lazy(() => import('react-player/lazy'));

type EcosystemVideoProps = {
  slug: string;
  className?: string;
};

function videoThumbnail(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  return true;
}

export default function EcosystemVideo({ slug, className }: EcosystemVideoProps) {
  const ecosystem = getEcosystem(slug);
  if (!ecosystem?.video) {
    return null;
  }

  const { url, caption } = ecosystem.video;

  return (
    <figure className={clsx(styles.mediaFigure, className)}>
      <div className={styles.videoContainer}>
        <React.Suspense fallback={<div className={styles.videoFallback} />}>
          <ReactPlayer
            url={url}
            width="100%"
            height="100%"
            controls
            light={videoThumbnail(url)}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        </React.Suspense>
      </div>
      {caption ? <figcaption className={styles.mediaCaption}>{caption}</figcaption> : null}
    </figure>
  );
}
