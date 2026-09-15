import { describe, expect, it } from 'vitest';

import {
  TYPING_CONSTANTS,
  formatFateTextForWrap,
  getTypingDelays,
} from '@/features/hud/model/typing-effect';

describe('getTypingDelays', () => {
  it('returns the alphabetic profile for pure Latin text', () => {
    const d = getTypingDelays('Hello world');
    expect(d.typeDelay).toBe(TYPING_CONSTANTS.ALPHABETIC_TYPING_DELAY);
    expect(d.deleteDelay).toBe(TYPING_CONSTANTS.ALPHABETIC_DELETE_DELAY);
    expect(d.pauseAfterType).toBe(TYPING_CONSTANTS.ALPHABETIC_PAUSE_AFTER_TYPE);
  });

  it('returns the CJK profile for Chinese text', () => {
    const d = getTypingDelays('你好世界');
    expect(d.typeDelay).toBe(TYPING_CONSTANTS.CJK_TYPING_DELAY);
    expect(d.deleteDelay).toBe(TYPING_CONSTANTS.CJK_DELETE_DELAY);
    expect(d.pauseAfterType).toBe(TYPING_CONSTANTS.CJK_PAUSE_AFTER_TYPE);
  });

  it('returns the CJK profile when text mixes CJK and Latin', () => {
    const d = getTypingDelays('你好world');
    expect(d.typeDelay).toBe(TYPING_CONSTANTS.CJK_TYPING_DELAY);
  });

  it('keeps accented Latin text on the alphabetic profile', () => {
    const d = getTypingDelays('Élan vital');
    expect(d.typeDelay).toBe(TYPING_CONSTANTS.ALPHABETIC_TYPING_DELAY);
  });

  it('returns the CJK profile for Japanese kana and Korean hangul', () => {
    expect(getTypingDelays('かな').typeDelay).toBe(TYPING_CONSTANTS.CJK_TYPING_DELAY);
    expect(getTypingDelays('한글').typeDelay).toBe(TYPING_CONSTANTS.CJK_TYPING_DELAY);
  });

  it('returns the CJK profile for empty text (no alphabetic to satisfy the `hasAlphabetic` branch)', () => {
    const d = getTypingDelays('');
    expect(d.typeDelay).toBe(TYPING_CONSTANTS.CJK_TYPING_DELAY);
  });

  it('returns the CJK profile for pure punctuation', () => {
    const d = getTypingDelays('!!!');
    expect(d.typeDelay).toBe(TYPING_CONSTANTS.CJK_TYPING_DELAY);
  });
});

describe('formatFateTextForWrap', () => {
  it('inserts a newline after a punctuation mark when the line is long enough', () => {
    const input = 'A'.repeat(TYPING_CONSTANTS.FATE_WRAP_MIN_UNITS) + ', more text';
    const out = formatFateTextForWrap(input);
    // ', ' 后面 18 单位换行
    expect(out).toContain('\n');
    expect(out.split('\n')[0].length).toBeGreaterThanOrEqual(TYPING_CONSTANTS.FATE_WRAP_MIN_UNITS);
  });

  it('does not insert a newline when the line is too short', () => {
    const input = 'Hello, world';
    const out = formatFateTextForWrap(input);
    expect(out).not.toContain('\n');
  });

  it('respects an existing newline as a unit reset', () => {
    const input = 'A\nB';
    const out = formatFateTextForWrap(input);
    expect(out).toBe('A\nB');
  });

  it('skips past leading spaces after punctuation before wrapping', () => {
    const longA = 'A'.repeat(TYPING_CONSTANTS.FATE_WRAP_MIN_UNITS);
    const input = `${longA},  Next sentence here`;
    const out = formatFateTextForWrap(input);
    expect(out).toContain('\n');
    // '\n' 后接 'Next' (跳过 '  ' 两个空格)
    expect(out.split('\n')[1]).toMatch(/^Next/);
  });
});
