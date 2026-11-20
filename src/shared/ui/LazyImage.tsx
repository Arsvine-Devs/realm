/* eslint-disable @next/next/no-img-element -- Media is resized at publication and served as static files. */
import { resolveAssetAlt, resolveRawAssetUrl } from '@/shared/lib/media';
import type { AssetReference } from '@/shared/types';
import styles from './LazyImage.module.scss';

interface LazyImageProps {
  src: AssetReference;
  alt?: string;
  className?: string;
}

export default function LazyImage({ src, alt, className = '' }: LazyImageProps) {
  const url = resolveRawAssetUrl(src);
  const dimensions = typeof src === 'object' && 'objectKey' in src ? src : undefined;
  return (
    <div className={`${styles.lazyImageContainer} ${className}`}>
      {url && (
        <img
          src={url}
          alt={resolveAssetAlt(src, alt)}
          width={dimensions?.width}
          height={dimensions?.height}
          className={styles.lazyImage}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
