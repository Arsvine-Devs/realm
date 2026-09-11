import { useCallback, useEffect, useRef, useState } from 'react';

export interface DetailSectionNavItem {
  id: string;
  label: string;
}

interface UseDetailSectionNavOptions {
  rootRef: React.RefObject<HTMLElement | null>;
  depsKey: string;
}

export function useDetailSectionNav({ rootRef, depsKey }: UseDetailSectionNavOptions) {
  const [activeNav, setActiveNav] = useState('hero');
  const [isPastHero, setIsPastHero] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const id = entry.target.getAttribute('data-nav-id');
          if (id) {
            setActiveNav(id);
          }
        });
      },
      { threshold: 0.3, root },
    );

    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.getAttribute('data-nav-id') === 'hero') {
            setIsPastHero(!entry.isIntersecting);
          }
        });
      },
      { threshold: 0.55, root },
    );

    Object.values(sectionRefs.current).forEach((element) => {
      if (!element) {
        return;
      }

      navObserver.observe(element);
      if (element.getAttribute('data-nav-id') === 'hero') {
        heroObserver.observe(element);
      }
    });

    return () => {
      navObserver.disconnect();
      heroObserver.disconnect();
    };
  }, [depsKey, rootRef]);

  const bindSectionRef = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      sectionRefs.current[id] = element;
    },
    [],
  );

  const scrollToSection = useCallback((id: string) => {
    const section = sectionRefs.current[id];
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    activeNav,
    bindSectionRef,
    isPastHero,
    sectionRefs,
    scrollToSection,
  };
}
