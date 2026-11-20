/* eslint-disable @next/next/no-img-element -- lightbox animation needs direct control over the rendered image element */
import React, { useEffect, useId, useLayoutEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTranslations } from 'next-intl';
import styles from './Lightbox.module.scss';
import { useSafeTimeouts } from '@/shared/hooks/useSafeTimeouts';
import { useReducedMotion } from '@/shared/hooks/useMediaQuery';
import { resolveAssetAlt, resolveRawAssetUrl } from '@/shared/lib/media';
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
  const overlayRef = useRef<HTMLDialogElement | null>(null);
  const backdropPress = useRef(false);
  const captionId = useId();
  const t = useTranslations('lightbox');
  const reducedMotion = useReducedMotion();
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevSrcRef = useRef<string | null>(null);
  const isFirstRender = useRef(true);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const safeTimers = useSafeTimeouts();

  useLayoutEffect(() => {
    const dialog = overlayRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const handleInternalNext = useCallback(() => {
    if (reducedMotion && !isAnimatingOut) {
      onNext?.();
      return;
    }
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
  }, [onNext, isAnimatingOut, isCrossfading, reducedMotion, safeTimers]);

  const handleInternalPrev = useCallback(() => {
    if (reducedMotion && !isAnimatingOut) {
      onPrev?.();
      return;
    }
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
  }, [onPrev, isAnimatingOut, isCrossfading, reducedMotion, safeTimers]);

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

    const imageUrl = resolveRawAssetUrl(image.src);
    const isNavigation = prevSrcRef.current && prevSrcRef.current !== imageUrl;
    prevSrcRef.current = imageUrl;
    if (reducedMotion) {
      imgElement.style.transition = 'none';
      imgElement.style.transform = 'none';
      imgElement.style.visibility = 'visible';
      imgElement.style.opacity = '1';
      return;
    }

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
  }, [image, thumbnailRect, reducedMotion]);

  const finishClose = useCallback(() => {
    overlayRef.current?.close();
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (isAnimatingOut) return;
    if (reducedMotion) {
      finishClose();
      return;
    }
    setIsAnimatingOut(true);

    const imgElement = imageRef.current;
    const overlayElement = overlayRef.current;

    if (overlayElement) {
      overlayElement.classList.remove(styles.visible);
      overlayElement.classList.add(styles.fadeOut);
    }

    const targetRectForClose = getClosingRectForIndex ? getClosingRectForIndex() : null;

    if (
      imgElement &&
      targetRectForClose &&
      imgElement.offsetWidth > 0 &&
      imgElement.offsetHeight > 0
    ) {
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

      safeTimers.setTimeout(finishClose, 450);
    } else if (imgElement) {
      imgElement.style.transition =
        'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
      imgElement.style.transformOrigin = 'center center';
      imgElement.style.transform = 'scale(0.5)';
      imgElement.style.opacity = '0';

      safeTimers.setTimeout(finishClose, 350);
    } else {
      finishClose();
    }
  }, [isAnimatingOut, getClosingRectForIndex, finishClose, reducedMotion, safeTimers]);

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
    const dialog = overlayRef.current;
    if (!dialog) return;

    const handleWheel = (event: WheelEvent) => {
      if (isAnimatingOut || event.ctrlKey || event.metaKey || event.deltaY === 0) return;
      event.preventDefault();
      if (event.deltaY > 0) handleInternalNext();
      else handleInternalPrev();
    };

    dialog.addEventListener('wheel', handleWheel, { passive: false });
    return () => dialog.removeEventListener('wheel', handleWheel);
  }, [isAnimatingOut, handleInternalPrev, handleInternalNext]);
  if (!image) return null;

  return ReactDOM.createPortal(
    <dialog
      ref={overlayRef}
      className={`${styles.lightboxOverlay} ${isAnimatingOut ? styles.fadeOut : ''}`}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) handleClose();
        backdropPress.current = false;
      }}
      aria-label={t('gallery')}
      aria-describedby={image.caption ? captionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') handleInternalPrev();
        else handleInternalNext();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className={styles.closeButton}
        onClick={handleClose}
        aria-label={t('close')}
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className={styles.lightboxContainer}>
        {onPrev && (
          <button
            type="button"
            className={`${styles.lightboxButton} ${styles.prevButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleInternalPrev();
            }}
            aria-label={t('previous')}
          />
        )}

        <img
          ref={imageRef}
          src={resolveRawAssetUrl(image.src)}
          alt={resolveAssetAlt(image.src, image.caption || t('image'))}
          className={styles.lightboxImage}
          style={{ willChange: 'transform, opacity' }}
        />
        {image.caption && (
          <div id={captionId} className={styles.lightboxCaption}>
            {image.caption}
          </div>
        )}

        {onNext && (
          <button
            type="button"
            className={`${styles.lightboxButton} ${styles.nextButton}`}
            onClick={(e) => {
              e.stopPropagation();
              handleInternalNext();
            }}
            aria-label={t('next')}
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
    </dialog>,
    document.body,
  );
};

export default Lightbox;
