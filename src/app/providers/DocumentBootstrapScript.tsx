'use client';

import { useServerInsertedHTML } from 'next/navigation';

interface DocumentBootstrapScriptProps {
  script: string;
}

export default function DocumentBootstrapScript({ script }: DocumentBootstrapScriptProps) {
  useServerInsertedHTML(() => (
    <script id="document-bootstrap" dangerouslySetInnerHTML={{ __html: script }} />
  ));

  return null;
}
