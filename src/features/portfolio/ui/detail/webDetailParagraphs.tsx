import React from 'react';
import type { CopyableToken } from '../../../../shared/types';
import { getSafeExternalLinkVariant, getSafeExternalUrl } from '@/shared/lib/safe-external-href';

interface WebDetailParagraphTextSegment {
  type: 'text';
  text: string;
}

interface WebDetailParagraphLinkSegment {
  type: 'link';
  text: string;
  href: string;
  variant: 'default' | 'bilibili' | 'github';
}

interface WebDetailParagraphCopyableSegment {
  type: 'copyable';
  text: string;
  label?: string;
  tokenIndex: number;
}

export type WebDetailParagraphSegment =
  WebDetailParagraphTextSegment | WebDetailParagraphLinkSegment | WebDetailParagraphCopyableSegment;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseWebDetailParagraph(
  text: string,
  copyableTokens: CopyableToken[],
): WebDetailParagraphSegment[] {
  const segments: WebDetailParagraphSegment[] = [];
  const tokenGroupBase = 4;
  const tokenAlternation = copyableTokens
    .map((token) => `(${escapeRegExp(token.pattern)})`)
    .join('|');
  const regex = new RegExp(
    tokenAlternation
      ? `(\\[([^\\]]+)\\]\\(([^)]+)\\))|${tokenAlternation}`
      : `(\\[([^\\]]+)\\]\\(([^)]+)\\))`,
    'g',
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      const safeUrl = getSafeExternalUrl(match[3]);
      if (!safeUrl) {
        segments.push({ type: 'text', text: match[2] });
        lastIndex = match.index + match[0].length;
        continue;
      }

      segments.push({
        type: 'link',
        text: match[2],
        href: safeUrl.href,
        variant: getSafeExternalLinkVariant(safeUrl),
      });
    } else {
      for (let tokenIndex = 0; tokenIndex < copyableTokens.length; tokenIndex += 1) {
        const captured = match[tokenGroupBase + tokenIndex];
        if (!captured) {
          continue;
        }

        segments.push({
          type: 'copyable',
          text: captured,
          label: copyableTokens[tokenIndex].label,
          tokenIndex,
        });
        break;
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
}

interface WebDetailParagraphProps {
  paragraph: string;
  paragraphIndex: number;
  copyableTokens: CopyableToken[];
  copiedId: string | null;
  copiedLabel: string;
  onCopy: (text: string, id: string) => void;
  styles: Record<string, string>;
}

export function WebDetailParagraph({
  paragraph,
  paragraphIndex,
  copyableTokens,
  copiedId,
  copiedLabel,
  onCopy,
  styles,
}: WebDetailParagraphProps) {
  const segments = parseWebDetailParagraph(paragraph, copyableTokens);

  return (
    <>
      {segments.map((segment, index) => {
        const key = `${paragraphIndex}-${index}`;
        if (segment.type === 'text') {
          return <React.Fragment key={key}>{segment.text}</React.Fragment>;
        }

        if (segment.type === 'copyable') {
          const copyId = `copy-${segment.tokenIndex}-${paragraphIndex}`;
          return (
            <span key={key} className={styles.copyableTextContainer}>
              <button
                onClick={() => onCopy(segment.text, copyId)}
                className={styles.copyableTextButton}
                title={segment.label}
              >
                {segment.text}
              </button>
              {copiedId === copyId && <span className={styles.copyFeedback}>{copiedLabel}</span>}
            </span>
          );
        }

        if (segment.variant === 'default') {
          return (
            <a
              key={key}
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inlineLink}
            >
              {segment.text}
            </a>
          );
        }

        const icon =
          segment.variant === 'bilibili' ? (
            <svg className={styles.linkIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                fill="currentColor"
                d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.199 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z"
              />
            </svg>
          ) : (
            <svg className={styles.linkIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                fill="currentColor"
              />
            </svg>
          );

        return (
          <span key={key} className={styles.iconLinkContainer}>
            <a
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inlineIconLink}
            >
              <span className={styles.inlineIconSvgContainer}>{icon}</span>
              <span className={styles.inlineIconText}>{segment.text}</span>
              <div className={styles.iconRipple} />
            </a>
          </span>
        );
      })}
    </>
  );
}
