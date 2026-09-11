import React, { useState, useEffect, useRef } from 'react';
import styles from './LazyImage.module.scss';
import {
  resolveAssetAlt,
  resolveImagePictureSources,
  resolveImageUrl,
  type ImagePreset,
} from '@/shared/lib/cdn';
import type { AssetReference } from '@/shared/types';

const QUALITY_PRESET_MAP: Record<string, ImagePreset> = {
  low: 'thumb',
  medium: 'card',
  high: 'large',
};

interface LazyImageProps {
  src: AssetReference;
  alt?: string;
  className?: string;
  thumbnailSrc?: string | null;
  onLoad?: (() => void) | null;
  enableWebP?: boolean;
  quality?: keyof typeof QUALITY_PRESET_MAP;
  preset?: ImagePreset | null;
}

const LazyImage = ({
  src,
  alt,
  className = '',
  thumbnailSrc = null,
  onLoad = null,
  enableWebP = true,
  quality = 'medium', // low, medium, high
  preset = null,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(thumbnailSrc);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const effectivePreset = preset || QUALITY_PRESET_MAP[quality] || 'card';
  const pictureSources = resolveImagePictureSources(src, effectivePreset);
  const resolvedAlt = resolveAssetAlt(src, alt);

  // Generate processed image URL with quality parameters.
  // EO 参数统一由 lib/cdn.ts 里的固定 preset 映射控制。
  const getProcessedImageUrl = (originalUrl: AssetReference, requestedPreset: ImagePreset) => {
    return resolveImageUrl(originalUrl, requestedPreset);
  };

  const getThumbnailUrl = (originalUrl: AssetReference) => {
    return resolveImageUrl(originalUrl, 'blur');
  };

  // Intersection Observer 用于检测图片是否进入视窗
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 当图片进入视窗时开始渐进式加载
  useEffect(() => {
    if (!isInView) return;

    const loadImage = async () => {
      const highQualityUrl = getProcessedImageUrl(src, effectivePreset);
      let highQualityLoaded = false;

      // 缩略图与高质图并行请求（原串行 await 缩略图会延迟高质图首字节）
      if (!thumbnailSrc) {
        const thumbnailUrl = getThumbnailUrl(src);
        setCurrentSrc(thumbnailUrl);
        const thumbnailImg = new Image();
        thumbnailImg.onload = () => {
          if (!highQualityLoaded) setCurrentSrc(thumbnailUrl);
        };
        thumbnailImg.src = thumbnailUrl;
      }

      const highQualityImg = new Image();
      highQualityImg.onload = () => {
        highQualityLoaded = true;
        setCurrentSrc(highQualityUrl);
        setIsLoaded(true);
        if (onLoad) onLoad();
      };
      highQualityImg.onerror = () => {
        // 加载失败时退出 loading 态，保留缩略图（若有）避免永久 spinner
        highQualityLoaded = true;
        setIsLoaded(true);
        if (onLoad) onLoad();
      };
      highQualityImg.src = highQualityUrl;
    };

    loadImage();
  }, [effectivePreset, enableWebP, isInView, onLoad, quality, src, thumbnailSrc]);

  return (
    <div ref={imgRef} className={`${styles.lazyImageContainer} ${className}`}>
      {currentSrc ? (
        <picture>
          {enableWebP && pictureSources?.avifUrl && (
            <source srcSet={pictureSources.avifUrl} type="image/avif" />
          )}
          {enableWebP && pictureSources?.webpUrl && (
            <source srcSet={pictureSources.webpUrl} type="image/webp" />
          )}
          <img
            src={currentSrc}
            alt={resolvedAlt}
            className={`${styles.lazyImage} ${isLoaded ? styles.loaded : styles.loading}`}
            loading="lazy"
          />
        </picture>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.spinner}></div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
