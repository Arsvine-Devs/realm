import { useCallback, useState } from 'react';

import { CONTENT_DETAIL_EXIT_DELAY_MS } from '@/shared/lib/ui-timings';

export interface LeftNavigationLink {
  label: string;
  href: string;
  group: 'content' | 'standalone';
  hash?: string;
}

export function useTesseractDragFeedback(isActivated: boolean) {
  const [dragging, setDragging] = useState(false);
  return {
    displayedDragging: isActivated && dragging,
    onDraggingChange: setDragging,
  };
}

export function useLeftPanelNavigation({
  closeDrawer,
  isContentPage,
  isDetailOpen,
  handleBack,
  navigateTo,
}: {
  closeDrawer: () => void;
  isContentPage: boolean;
  isDetailOpen: () => boolean;
  handleBack: () => void;
  navigateTo: (url: string) => void;
}) {
  const updateContentHashAndScroll = useCallback((link: LeftNavigationLink) => {
    if (!link.hash) return;
    const nextUrl = new URL(link.href, window.location.origin);
    const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextHref !== currentHref) window.history.pushState(window.history.state, '', nextHref);
    document
      .getElementById(`section-${link.hash}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return useCallback(
    (link: LeftNavigationLink) => {
      closeDrawer();
      if (link.hash && isContentPage) {
        if (isDetailOpen()) {
          handleBack();
          window.setTimeout(() => updateContentHashAndScroll(link), CONTENT_DETAIL_EXIT_DELAY_MS);
        } else {
          updateContentHashAndScroll(link);
        }
        return;
      }
      navigateTo(link.href);
    },
    [closeDrawer, handleBack, isContentPage, isDetailOpen, navigateTo, updateContentHashAndScroll],
  );
}
