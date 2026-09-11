import { useEffect, useState } from 'react';

function normalizeLanguageCode(value: string): string | null {
  const normalized = value.replace(/_/g, '-').trim();
  if (!normalized) return null;

  const parts = normalized.split('-').filter(Boolean);
  if (parts.length === 0) return null;

  return parts
    .map((part, index) => {
      if (index === 0) return part.toLowerCase();
      if (/^[A-Za-z]{2}$/.test(part) || /^[0-9]{3}$/.test(part)) return part.toUpperCase();
      if (/^[A-Za-z]{4}$/.test(part))
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      return part;
    })
    .join('-');
}

export default function useVisitorLanguageCode(): string | null {
  const [languageCode, setLanguageCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const candidates = [
      ...(navigator.languages ?? []),
      navigator.language,
      document.documentElement.lang,
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
      const normalized = normalizeLanguageCode(candidate);
      if (!normalized) continue;
      queueMicrotask(() => setLanguageCode(normalized));
      return;
    }
  }, []);

  return languageCode;
}
