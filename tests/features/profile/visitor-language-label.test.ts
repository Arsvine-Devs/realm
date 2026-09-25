import { describe, expect, it } from 'vitest';

import { getVisitorLanguageLabel } from '@/features/profile/model/visitorLanguageLabel';

describe('visitor language autonyms', () => {
  it('distinguishes simplified and traditional Chinese tags', () => {
    expect(getVisitorLanguageLabel('zh-CN')).toBe('简中');
    expect(getVisitorLanguageLabel('zh-Hans-SG')).toBe('简中');
    expect(getVisitorLanguageLabel('zh-TW')).toBe('繁中');
    expect(getVisitorLanguageLabel('zh-Hant')).toBe('繁中');
    expect(getVisitorLanguageLabel('zh-HK')).toBe('繁中');
  });

  it('uses the language name in its own language and ignores the region', () => {
    expect(getVisitorLanguageLabel('en-US')).toBe('English');
    expect(getVisitorLanguageLabel('ja-JP')).toBe('日本語');
    expect(getVisitorLanguageLabel('ru-RU')).toBe('русский');
  });

  it('preserves an unknown code and returns null when no code is available', () => {
    expect(getVisitorLanguageLabel('zz-ZZ')).toBe('zz-ZZ');
    expect(getVisitorLanguageLabel(null)).toBeNull();
  });
});
