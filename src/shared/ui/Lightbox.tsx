/* eslint-disable @next/next/no-img-element -- lightbox animation needs direct control over the rendered image element */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './Lightbox.module.scss';
import { useSafeTimeouts } from '@/shared/hooks/useSafeTimeouts';
import { resolveAssetAlt, resolveImageUrl } from '@/shared/lib/cdn';
import type { GalleryImage } from '@/shared/types';

const SWIPE_THRESHOLD = 50;

interface LightboxProps {
  image: GalleryImage;
  onClose: () => void;
  onPrev?: (() => void) | null;
  onNext?: (() => void) | null;
  thumbnailRect?: DOMRect | null;
  currentIndex?: number;
  totalImages?: number;
  getClosingRectForIndex?: (() => DOMRect | null) | null;
}

const Lightbox = ({
  image,
  onClose,
  onPrev,
  onNext,
  thumbnailRect,
  currentIndex,
  totalImages,
  getClosingRectForIndex,
}: LightboxProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevSrcRef = useRef<string | null>(null);
  const isFirstRender = useRef(true);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const safeTimers = useSafeTimeouts();

  const handleInternalNext = useCallback(() => {
    if (onNext && !isAnimatingOut && !isCrossfading) {
      setIsCrossfading(true);
      const imgElement = imageRef.current;
      if (imgElement) {
        imgElement.style.transition = 'opacity 0.15s ease-out';
        imgElement.style.opacity = '0';
        safeTimers.setTimeout(() => onNext(), 150);
      } else {
        onNext();
      }
    }
  }, [onNext, isAnimatingOut, isCrossfading, safeTimers]);

  const handleInternalPrev = useCallback(() => {
    if (onPrev && !isAnimatingOut && !isCrossfading) {
      setIsCrossfading(true);
      const imgElement = imageRef.current;
      if (imgElement) {
        imgElement.style.transition = 'opacity 0.15s ease-out';
        imgElement.style.opacity = '0';
        safeTimers.setTimeout(() => onPrev(), 150);
      } else {
        onPrev();
      }
    }
  }, [onPrev, isAnimatingOut, isCrossfading, safeTimers]);

  useEffect(() => {
    const imgElement = imageRef.current;
    if (!imgElement || !image) return;

    const overlayElement = overlayRef.current;
    if (overlayElement) {
      overlayElement.classList.remove(styles.fadeOut);
      if (!overlayElement.classList.contains(styles.visible)) {
        overlayElement.classList.remove(styles.visible);
        void overlayElement.offsetWidth;
        overlayElement.classList.add(styles.visible);
      }
    }

    const imageUrl = resolveImageUrl(image.src, 'large');
    const isNavigation = prevSrcRef.current && prevSrcRef.current !== imageUrl;
    prevSrcRef.current = imageUrl;

    if (isNavigation) {
      imgElement.style.transition = 'none';
      imgElement.style.transform = 'none';
      imgElement.style.opacity = '0';

      const fadeIn = () => {
        imgElement.style.transition = 'opacity 0.2s ease-in';
        imgElement.style.opacity = '1';
        setIsCrossfading(false);
      };

      if (imgElement.complete && imgElement.naturalWidth > 0) {
        requestAnimationFrame(fadeIn);
      } else {
        imgElement.onload = () => requestAnimationFrame(fadeIn);
        imgElement.onerror = () => {
          imgElement.style.opacity = '1';
          setIsCrossfading(false);
        };
      }
      return;
    }

    if (thumbnailRect && isFirstRender.current) {
      isFirstRender.current = false;
      imgElement.style.transition = 'none';
      imgElement.style.visibility = 'hidden';
      imgElement.style.transform = 'none';
      imgElement.style.opacity = '0';

      const runFlip = () => {
        const finalRect = imgElement.getBoundingClientRect();
        if (finalRect.width < 10 || finalRect.height < 10) {
          imgElement.style.visibility = 'visible';
          imgElement.style.transformOrigin = 'center center';
          imgElement.style.transform = 'scale(0.92)';
          imgElement.style.opacity = '0';
          requestAnimationFrame(() => {
            imgElement.style.transition =
              'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
            imgElement.style.transform = 'scale(1)';
            imgElement.style.opacity = '1';
          });
          return;
        }

        const scaleX = thumbnailRect.width / finalRect.width;
        const scaleY = thumbnailRect.height / finalRect.height;
        const translateX = thumbnailRect.left - finalRect.left;
        const translateY = thumbnailRect.top - finalRect.top;

        imgElement.style.transformOrigin = 'top left';
        imgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
        imgElement.style.visibility = 'visible';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            imgElement.style.transition =
              'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out 0.1s';
            imgElement.style.transform = 'translate(0px, 0px) scale(1)';
            imgElement.style.opacity = '1';
          });
        });
      };

      if (imgElement.complete && imgElement.naturalWidth > 0) {
        requestAnimationFrame(runFlip);
      } else {
        imgElement.onload = () => requestAnimationFrame(runFlip);
        imgElement.onerror = () => {
          imgElement.style.visibility = 'visible';
          imgElement.style.opacity = '1';
          imgElement.style.transform = 'none';
        };
      }
    } else if (!isFirstRender.current) {
      imgElement.style.opacity = '1';
      imgElement.style.transform = 'none';
      imgElement.style.transition = 'none';
    } else {
      isFirstRender.current = false;
      imgElement.style.transformOrigin = 'center center';
      imgElement.style.transform = 'scale(0.92)';
      imgElement.style.opacity = '0';
      imgElement.style.visibility = 'visible';
      requestAnimationFrame(() => {
        imgElement.style.transition =
          'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
        imgElement.style.transform = 'scale(1)';
        imgElement.style.opacity = '1';
      });
    }

    return () => {
      if (imgElement) {
        imgElement.onload = null;
        imgElement.onerror = null;
      }
    };
  }, [image, thumbnailRect]);

  const handleClose = useCallback(() => {
    if (isAnimatingOut) return;
    setIsAnimatingOut(true);

    const imgElement = imageRef.current;
    const overlayElement = overlayRef.current;

    if (overlayElement) {
      overlayElement.classList.remove(styles.visible);
      overlayElement.classList.add(styles.fadeOut);
    }

    const targetRectForClose = getClosingRectForIndex ? getClosingRectForIndex() : null;

    if (imgElement && targetRectForClose) {
      const finalRect = imgElement.getBoundingClientRect();
      const scaleX = targetRectForClose.width / finalRect.width;
      const scaleY = targetRectForClose.height / finalRect.height;
      const translateX = targetRectForClose.left - finalRect.left;
      const translateY = targetRectForClose.top - finalRect.top;

      imgElement.style.transition =
        'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.05s';
      imgElement.style.transformOrigin = 'top left';
      imgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
      imgElement.style.opacity = '0';

      safeTimers.setTimeout(() => {
        onClose();
        setIsAnimatingOut(false);
      }, 450);
    } else if (imgElement) {
      imgElement.style.transition =
        'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
      imgElement.style.transformOrigin = 'center center';
      imgElement.style.transform = 'scale(0.5)';
      imgElement.style.opacity = '0';

      safeTimers.setTimeout(() => {
        onClose();
        setIsAnimatingOut(false);
      }, 350);
    } else {
      onClose();
      setIsAnimatingOut(false);
    }
  }, [isAnimatingOut, getClosingRectForIndex, onClose, safeTimers]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || isAnimatingOut) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isAnimatingOut) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0 && onPrev) handleInternalPrev();
    else if (dx < 0 && onNext) handleInternalNext();
  };

  useEffect(() => {
    const disableScroll = () => {
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    };

    const enableScroll = () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isAnimatingOut) return;
      if (event.key === 'Escape') handleClose();
      if (event.key === 'ArrowLeft') handleInternalPrev();
      if (event.key === 'ArrowRight') handleInternalNext();
    };

    const handleWheel = (event: WheelEvent) => {
      if (isAnimatingOut) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.deltaY > 0) handleInternalNext();
      else if (event.deltaY < 0) handleInternalPrev();
    };

    disableScroll();
    window.addEventListener('keydown', handleKeyDown);
    const lightboxElement = overlayRef.current;
    if (lightboxElement) {
      lightboxElement.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      enableScroll();
      window.removeEventListener('keydown', handleKeyDown);
      if (lightboxElement) {
        lightboxElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, [isAnimatingOut, handleClose, handleInternalPrev, handleInternalNext]);

  if (!image) return null;

  return ReactDOM.createPortal(
    // The dialog backdrop owns pointer dismissal; Escape and the document key handler own keyboard dismissal.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a dialog container owns backdrop dismissal and cannot be replaced by a button.
    <div
      ref={overlayRef}
      className={`${styles.lightboxOverlay} ${isAnimatingOut ? styles.fadeOut : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a dialog container is the correct accessible role for this lightbox surface. */
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-caption"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') handleClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.lightboxContainer}>
        {onPrev && (
          <button
            className={`${styles.lightboxButton} ${styles.prevButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleInternalPrev();
            }}
            aria-label="Previous image"
            data-cursor-label="PREVIOUS IMAGE"
          />
        )}

        <img
          ref={imageRef}
          src={resolveImageUrl(image.src, 'large')}
          alt={resolveAssetAlt(image.src, image.caption || 'Lightbox image')}
          className={styles.lightboxImage}
          style={{ willChange: 'transform, opacity' }}
        />
        {image.caption && (
          <div id="lightbox-caption" className={styles.lightboxCaption}>
            {image.caption}
          </div>
        )}

        {onNext && (
          <button
            className={`${styles.lightboxButton} ${styles.nextButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleInternalNext();
            }}
            aria-label="Next image"
            data-cursor-label="NEXT IMAGE"
          />
        )}

        {typeof currentIndex === 'number' && typeof totalImages === 'number' && totalImages > 1 && (
          <div className={styles.dotsContainer}>
            {Array.from({ length: totalImages }).map((_, index) => (
              <span
                key={index}
                className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
              ></span>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Lightbox;
