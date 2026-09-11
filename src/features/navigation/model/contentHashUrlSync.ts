const contentSectionHashes = ['works', 'experience', 'blog', 'life', 'contact', 'about'] as const;

export type ContentSectionHash = (typeof contentSectionHashes)[number];

interface SectionDocument {
  getElementById: (id: string) => HTMLElement | null;
}

interface ContentHashLocation {
  pathname: string;
  search: string;
  hash: string;
}

interface ContentHashHistory {
  state: unknown;
  replaceState: (data: unknown, unused: string, url?: string | URL | null) => void;
}

function isContentPathname(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 2 && segments[1] === 'content';
}

export function getActiveContentSectionHash(
  container: HTMLElement,
  documentRef: SectionDocument = document,
): ContentSectionHash | null {
  const containerTop = container.getBoundingClientRect().top;
  let firstSection: ContentSectionHash | null = null;
  let activeSection: ContentSectionHash | null = null;

  for (const hash of contentSectionHashes) {
    const section = documentRef.getElementById(`section-${hash}`);
    if (!section) continue;
    firstSection ??= hash;
    if (section.getBoundingClientRect().top <= containerTop + 1) {
      activeSection = hash;
    }
  }

  return activeSection ?? firstSection;
}

/**
 * Mirrors the section currently being read into the address bar without
 * creating a history entry or invoking the Next.js router.
 */
export function syncContentHashFromScroll(
  container: HTMLElement,
  {
    documentRef = document,
    historyRef = window.history,
    locationRef = window.location,
  }: {
    documentRef?: SectionDocument;
    historyRef?: ContentHashHistory;
    locationRef?: ContentHashLocation;
  } = {},
): ContentSectionHash | null {
  if (!isContentPathname(locationRef.pathname)) return null;

  const hash = getActiveContentSectionHash(container, documentRef);
  if (!hash || locationRef.hash === `#${hash}`) return hash;

  historyRef.replaceState(
    historyRef.state,
    '',
    `${locationRef.pathname}${locationRef.search}#${encodeURIComponent(hash)}`,
  );
  return hash;
}
