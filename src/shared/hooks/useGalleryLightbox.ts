import { useCallback, useRef, useState } from 'react';

type LightboxSourceType = string;

interface LightboxSourceInfo {
  index: number;
  type: LightboxSourceType;
}

interface LightboxTriggerEventLike {
  currentTarget?: EventTarget | null;
}

export default function useGalleryLightbox(imageCount: number) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentLightboxImageIndex, setCurrentLightboxImageIndex] = useState(0);
  const [clickedThumbnailRect, setClickedThumbnailRect] = useState<DOMRect | null>(null);
  const [currentLightboxSourceInfo, setCurrentLightboxSourceInfo] =
    useState<LightboxSourceInfo | null>(null);
  const thumbnailRefs = useRef<Record<string, HTMLElement | null>>({});

  const bindThumbnailRef = useCallback(
    (key: string) => (element: HTMLElement | null) => {
      thumbnailRefs.current[key] = element;
    },
    [],
  );

  const openLightbox = useCallback(
    (
      index: number,
      event?: LightboxTriggerEventLike | null,
      sourceType: LightboxSourceType = 'thumb',
    ) => {
      if (index < 0 || index >= imageCount) {
        return;
      }

      let rect: DOMRect | null = null;
      const currentTarget = event?.currentTarget;

      if (currentTarget instanceof Element) {
        rect = currentTarget.getBoundingClientRect();
      } else {
        const thumb = thumbnailRefs.current[`${sourceType}_${index}`];
        if (thumb) {
          rect = thumb.getBoundingClientRect();
        }
      }

      setClickedThumbnailRect(rect);
      setCurrentLightboxImageIndex(index);
      setCurrentLightboxSourceInfo({ index, type: sourceType });
      setIsLightboxOpen(true);
    },
    [imageCount],
  );

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    setCurrentLightboxSourceInfo(null);
    setClickedThumbnailRect(null);
  }, []);

  const showNextImage = useCallback(() => {
    if (imageCount <= 0) {
      return;
    }
    setClickedThumbnailRect(null);
    setCurrentLightboxImageIndex((prev) => (prev + 1) % imageCount);
  }, [imageCount]);

  const showPrevImage = useCallback(() => {
    if (imageCount <= 0) {
      return;
    }
    setClickedThumbnailRect(null);
    setCurrentLightboxImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const getClosingRect = useCallback(() => {
    if (!currentLightboxSourceInfo) {
      return null;
    }

    const refKey = `${currentLightboxSourceInfo.type}_${currentLightboxSourceInfo.index}`;
    const thumb = thumbnailRefs.current[refKey];
    return thumb ? thumb.getBoundingClientRect() : null;
  }, [currentLightboxSourceInfo]);

  return {
    isLightboxOpen,
    currentLightboxImageIndex,
    clickedThumbnailRect,
    bindThumbnailRef,
    openLightbox,
    closeLightbox,
    showNextImage,
    showPrevImage,
    getClosingRect,
  };
}
