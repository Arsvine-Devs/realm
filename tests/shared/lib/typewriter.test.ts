import { describe, expect, it } from 'vitest';

import {
  createTypewriterSequence,
  DEFAULT_TYPEWRITER_DURATION_MS,
  splitTypewriterText,
} from '@/shared/lib/typewriter';

describe('typewriter sequences', () => {
  it('reveals complete graphemes in plain mode', () => {
    const target = 'e\u0301👩‍🚀';
    const sequence = createTypewriterSequence(target, 'plain');

    expect(sequence.stepCount).toBe(2);
    expect(sequence.durationMs).toBe(DEFAULT_TYPEWRITER_DURATION_MS);
    expect(sequence.frameAt(1)).toBe('e\u0301');
    expect(sequence.frameAt(2)).toBe(target);
  });

  it('shows script-matched characters before correcting them from left to right', () => {
    const target = 'A中あ한Ж!';
    const graphemes = splitTypewriterText(target)!;
    const sequence = createTypewriterSequence(target, 'scramble', { random: () => 0.5 });
    const scrambled = sequence.frameAt(graphemes.length);

    expect(sequence.stepCount).toBe(graphemes.length * 2);
    expect(sequence.durationMs).toBe(DEFAULT_TYPEWRITER_DURATION_MS);
    expect(splitTypewriterText(scrambled)).toHaveLength(graphemes.length);
    expect(splitTypewriterText(scrambled)?.[0]).not.toBe('A');
    expect(sequence.frameAt(graphemes.length + 1).startsWith('A')).toBe(true);
    expect(sequence.frameAt(sequence.stepCount)).toBe(target);
  });

  it('automatically uses fixed word parts for Latin, Cyrillic, and French text', () => {
    for (const [target, expectedAnchors] of [
      ['Hello, world!', ['Hello,', 'world!']],
      ['Привет, мир!', ['Привет,', 'мир!']],
      ['Bonjour, le monde!', ['Bonjour,', 'le', 'monde!']],
    ] as const) {
      const sequence = createTypewriterSequence(target, 'scramble', { random: () => 0.999 });
      const parts = sequence.framePartsAt(sequence.stepCount / 2);

      expect(sequence.granularity).toBe('word');
      expect(parts.filter((part) => part.kind === 'word').map((part) => part.anchor)).toEqual(
        expectedAnchors,
      );
      parts
        .filter((part): part is Extract<typeof part, { kind: 'word' }> => part.kind === 'word')
        .forEach((part) => {
          expect(splitTypewriterText(part.text)?.length).toBe(
            splitTypewriterText(part.anchor)?.length,
          );
        });
      expect(
        parts
          .filter((part) => part.kind === 'literal')
          .map((part) => part.text)
          .join(''),
      ).toContain(' ');
      expect(sequence.frameAt(sequence.stepCount)).toBe(target);
    }
  });

  it('keeps CJK, Japanese, and Korean on grapheme mode in auto selection', () => {
    for (const target of ['中文文本', '日本語の文章', '한국어 문장']) {
      const sequence = createTypewriterSequence(target, 'scramble', { random: () => 0.999 });
      expect(sequence.granularity).toBe('grapheme');
      expect(sequence.framePartsAt(sequence.stepCount)).toEqual([
        { kind: 'literal', text: target },
      ]);
    }
  });

  it('preserves letter case and extends the selected Chinese, Japanese, Korean, and Zhuyin pools', () => {
    const target = 'aBéДё!';
    const graphemes = splitTypewriterText(target)!;
    const sequence = createTypewriterSequence(target, 'scramble', {
      random: () => 0.999,
      granularity: 'grapheme',
    });

    expect(sequence.frameAt(graphemes.length)).toBe('zZzЯя!');

    const simplified = createTypewriterSequence('爱ㄅ', 'scramble', {
      random: () => 0.999,
      locale: 'zh-CN',
    });
    const traditional = createTypewriterSequence('愛ㄅ', 'scramble', {
      random: () => 0.999,
      locale: 'zh-TW',
    });

    expect(simplified.frameAt(2)).toBe('简ㄦ');
    expect(traditional.frameAt(2)).toBe('簡ㄦ');

    const rareHan = createTypewriterSequence('龘龖', 'scramble', { random: () => 0.999 });
    const rareKana = createTypewriterSequence('ヿヺ', 'scramble', { random: () => 0.999 });
    const rareHangul = createTypewriterSequence('뾰뿅', 'scramble', { random: () => 0.999 });

    expect(rareHan.frameAt(2)).toBe('龖龖');
    expect(rareKana.frameAt(2)).toBe('ヺヺ');
    expect(rareHangul.frameAt(2)).toBe('뿅뿅');
  });

  it('preserves whitespace, punctuation, emoji, combining graphemes, and unsupported scripts', () => {
    const target = 'A العربية! e\u0301👩‍🚀';
    const graphemes = splitTypewriterText(target)!;
    const sequence = createTypewriterSequence(target, 'scramble', { random: () => 0.5 });
    const scrambled = sequence.frameAt(graphemes.length);

    expect(scrambled).toContain(' العربية! ');
    expect(scrambled).toContain('👩‍🚀');
    expect(splitTypewriterText(scrambled)).toHaveLength(graphemes.length);
    expect(sequence.frameAt(sequence.stepCount)).toBe(target);
  });

  it('shows the complete target when grapheme segmentation is unavailable', () => {
    const target = 'e\u0301👩‍🚀';
    const sequence = createTypewriterSequence(target, 'scramble', { segmenter: null });

    expect(sequence.stepCount).toBe(0);
    expect(sequence.frameAt(0)).toBe(target);
    expect(splitTypewriterText(target, null)).toBeNull();
  });
});
