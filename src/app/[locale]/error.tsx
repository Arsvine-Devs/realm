'use client';

import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main role="alert">
      <h1>Unable to load this page</h1>
      <button type="button" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
