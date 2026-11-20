'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { useRef } from 'react';

interface DocumentBootstrapScriptProps {
  script: string;
  nonce?: string;
}

export default function DocumentBootstrapScript({ script, nonce }: DocumentBootstrapScriptProps) {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script id="document-bootstrap" nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />
    );
  });

  return null;
}
