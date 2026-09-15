import React, { useCallback, useEffect, useState } from 'react';
import styles from './styles.module.css';

interface ZoomableImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
}

export default function ZoomableImage({ src, alt, style }: ZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        style={style}
        className={styles.thumbnail}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={close}
        >
          <button className={styles.closeButton} aria-label="Close" onClick={close}>
            &times;
          </button>
          <img
            src={src}
            alt={alt}
            className={styles.fullImage}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
