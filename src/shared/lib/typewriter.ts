import type { Locale } from '@/shared/contracts/locale';

export type TypewriterMode = 'plain' | 'scramble';
type TypewriterGranularity = 'auto' | 'grapheme' | 'word';

export type TypewriterFramePart =
  { kind: 'literal'; text: string } | { kind: 'word'; text: string; anchor: string };

export interface TypewriterSequence {
  stepCount: number;
  durationMs: number;
  granularity: Exclude<TypewriterGranularity, 'auto'>;
  frameAt: (step: number) => string;
  framePartsAt: (step: number) => readonly TypewriterFramePart[];
}

export interface TypewriterSequenceOptions {
  random?: () => number;
  segmenter?: Intl.Segmenter | null;
  locale?: Locale;
  durationMs?: number;
  granularity?: TypewriterGranularity;
}

export const DEFAULT_TYPEWRITER_DURATION_MS = 1800;
export const TYPEWRITER_FRAME_INTERVAL_MS = 16;

export function getTypewriterStepAtProgress(sequence: TypewriterSequence, progress: number) {
  const boundedProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return Math.floor(boundedProgress * sequence.stepCount);
}

const graphemeSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
const wordSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'word' })
    : null;

const LATIN_UPPERCASE_CHARACTERS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const LATIN_LOWERCASE_CHARACTERS = Array.from('abcdefghijklmnopqrstuvwxyz');
const SIMPLIFIED_HAN_CHARACTERS = Array.from(
  '天地人心日月山水风云花雪星河梦想人生安全语言世界文化自然智慧时间声音故事美好希望爱梦风雨光明快乐未来成长思考方向生活朋友家庭社会历史文学科技艺术音乐学习工作空间文字阅读书本夜晚欢乐自由创造发现记录温暖勇气安静永远开始结束现在过去记忆明天勇敢后边网络软件信息习惯经验观念价值质量经济环境变化发展问题办法结果关系机会认识继续努力实现想象愿望相信分享帮助影响范围选择表达回顾风景学校飞翔耳朵眼睛颜色天气街云简',
);
const TRADITIONAL_HAN_CHARACTERS = Array.from(
  '天地人心日月山水風雲花雪星河夢想人生安全語言世界文化自然智慧時間聲音故事美好希望愛夢風雨光明快樂未來成長思考方向生活朋友家庭社會歷史文學科技藝術音樂學習工作空間文字閱讀書本夜晚歡樂自由創造發現記錄溫暖勇氣安靜永遠開始結束現在過去記憶明天勇敢後邊網絡軟體資訊習慣經驗觀念價值品質經濟環境變化發展問題辦法結果關係機會認識繼續努力實現想像願望相信分享幫助影響範圍選擇表達回顧風景學校飛翔耳朵眼睛顏色天氣街雲簡',
);
const BOPOMOFO_CHARACTERS = Array.from(
  'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ',
);
const KANA_CHARACTERS = Array.from(
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン',
);
const HANGUL_CHARACTERS = Array.from(
  '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호',
);
const CYRILLIC_UPPERCASE_CHARACTERS = Array.from('АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ');
const CYRILLIC_LOWERCASE_CHARACTERS = Array.from('абвгдежзийклмнопрстуфхцчшщъыьэюя');
const GREEK_CHARACTERS = Array.from('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω');
const BLOCK_CHARACTERS = Array.from('▪▫◼◻');
const SCRAMBLE_SYMBOL_CHANCE = 0.01;
const HAN_RE = /\p{Script=Han}/u;
const KANA_RE = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const HANGUL_RE = /\p{Script=Hangul}/u;
const BOPOMOFO_RE = /[\u3100-\u312f\u31a0-\u31bf]/u;
const WORD_SCRIPT_RE = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/u;
const LETTER_OR_NUMBER_RE = /[\p{L}\p{N}]/u;

interface ScramblePools {
  han: string[];
  kana: string[];
  hangul: string[];
  bopomofo: string[];
}

export function splitTypewriterText(
  text: string,
  segmenter: Intl.Segmenter | null = graphemeSegmenter,
): string[] | null {
  if (!segmenter) return null;
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

function pickRandomCharacter(pool: string[], random: () => number) {
  const value = random();
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, 0.999999)) : 0;
  return pool[Math.floor(safeValue * pool.length)] ?? '';
}

function extendCharacterPool(fixed: string[], graphemes: string[], script: RegExp) {
  return Array.from(new Set([...fixed, ...graphemes.filter((grapheme) => script.test(grapheme))]));
}

interface WordSegment {
  text: string;
  isWordLike: boolean;
}

function splitTypewriterWords(
  text: string,
  segmenter: Intl.Segmenter | null = wordSegmenter,
): WordSegment[] | null {
  if (!segmenter) return null;
  const segments = Array.from(segmenter.segment(text), (part) => ({
    text: part.segment,
    isWordLike: part.isWordLike === true,
  }));
  const merged: WordSegment[] = [];
  let pendingText = '';
  let pendingWordLike = false;
  const flushPending = () => {
    if (!pendingText) return;
    merged.push({ text: pendingText, isWordLike: pendingWordLike });
    pendingText = '';
    pendingWordLike = false;
  };

  segments.forEach((segment) => {
    if (/\s/u.test(segment.text)) {
      flushPending();
      merged.push(segment);
      return;
    }
    pendingText += segment.text;
    pendingWordLike ||= segment.isWordLike;
  });
  flushPending();
  return merged;
}

function isEligibleWordText(text: string, words: WordSegment[]) {
  const wordSegments = words.filter(
    (segment) => segment.isWordLike && LETTER_OR_NUMBER_RE.test(segment.text),
  );
  if (wordSegments.length === 0) return false;

  const allLetters = Array.from(text).filter((character) => LETTER_OR_NUMBER_RE.test(character));
  const eligibleLetters = allLetters.filter((character) => WORD_SCRIPT_RE.test(character));
  const eligibleRatio = allLetters.length > 0 ? eligibleLetters.length / allLetters.length : 0;
  const hasWordBoundary =
    /\s/u.test(text) ||
    wordSegments.some((segment) => (splitTypewriterText(segment.text)?.length ?? 0) >= 2);

  return eligibleRatio >= 0.6 && hasWordBoundary;
}

function createScramblePools(graphemes: string[], locale: Locale): ScramblePools {
  return {
    han: extendCharacterPool(
      locale === 'zh-TW' ? TRADITIONAL_HAN_CHARACTERS : SIMPLIFIED_HAN_CHARACTERS,
      graphemes,
      HAN_RE,
    ),
    kana: extendCharacterPool(KANA_CHARACTERS, graphemes, KANA_RE),
    hangul: extendCharacterPool(HANGUL_CHARACTERS, graphemes, HANGUL_RE),
    bopomofo: extendCharacterPool(BOPOMOFO_CHARACTERS, graphemes, BOPOMOFO_RE),
  };
}

function scrambleGrapheme(grapheme: string, random: () => number, pools: ScramblePools) {
  if (!LETTER_OR_NUMBER_RE.test(grapheme)) return grapheme;

  const isUppercase = /[\p{Lu}\p{Lt}]/u.test(grapheme);
  let pool: string[] | null = null;
  if (BOPOMOFO_RE.test(grapheme)) pool = pools.bopomofo;
  else if (HAN_RE.test(grapheme)) pool = pools.han;
  else if (KANA_RE.test(grapheme)) pool = pools.kana;
  else if (HANGUL_RE.test(grapheme)) pool = pools.hangul;
  else if (/\p{Script=Cyrillic}/u.test(grapheme)) {
    pool = isUppercase ? CYRILLIC_UPPERCASE_CHARACTERS : CYRILLIC_LOWERCASE_CHARACTERS;
  } else if (/\p{Script=Greek}/u.test(grapheme)) pool = GREEK_CHARACTERS;
  else if (/\p{Script=Latin}/u.test(grapheme)) {
    pool = isUppercase ? LATIN_UPPERCASE_CHARACTERS : LATIN_LOWERCASE_CHARACTERS;
  }
  if (!pool) return grapheme;

  return random() < SCRAMBLE_SYMBOL_CHANCE
    ? pickRandomCharacter(BLOCK_CHARACTERS, random)
    : pickRandomCharacter(pool, random);
}

function scrambleWord(word: string, random: () => number, pools: ScramblePools) {
  const graphemes = splitTypewriterText(word);
  if (!graphemes) return word;
  return graphemes.map((grapheme) => scrambleGrapheme(grapheme, random, pools)).join('');
}

function literalFrameParts(text: string): readonly TypewriterFramePart[] {
  return [{ kind: 'literal', text }];
}

export function createTypewriterSequence(
  text: string,
  mode: TypewriterMode,
  {
    random = Math.random,
    segmenter = graphemeSegmenter,
    locale = 'zh-CN',
    durationMs = DEFAULT_TYPEWRITER_DURATION_MS,
    granularity = 'auto',
  }: TypewriterSequenceOptions = {},
): TypewriterSequence {
  const safeDurationMs =
    Number.isFinite(durationMs) && durationMs > 0 ? durationMs : DEFAULT_TYPEWRITER_DURATION_MS;
  const graphemes = splitTypewriterText(text, segmenter);
  if (!graphemes) {
    return {
      stepCount: 0,
      durationMs: safeDurationMs,
      granularity: 'grapheme',
      frameAt: () => text,
      framePartsAt: () => literalFrameParts(text),
    };
  }

  if (mode === 'plain') {
    return {
      stepCount: graphemes.length,
      durationMs: safeDurationMs,
      granularity: 'grapheme',
      frameAt: (step) => graphemes.slice(0, Math.max(0, Math.min(graphemes.length, step))).join(''),
      framePartsAt: (step) =>
        literalFrameParts(
          graphemes.slice(0, Math.max(0, Math.min(graphemes.length, step))).join(''),
        ),
    };
  }

  const wordSegments = splitTypewriterWords(text);
  const useWordGranularity =
    wordSegments !== null &&
    (granularity === 'word' || (granularity === 'auto' && isEligibleWordText(text, wordSegments)));

  if (useWordGranularity && wordSegments) {
    const wordIndexes = wordSegments.flatMap((segment, index) =>
      segment.isWordLike ? [index] : [],
    );
    if (wordIndexes.length > 0) {
      const pools = createScramblePools(graphemes, locale);
      const scrambledWords = new Map(
        wordIndexes.map((index) => [
          index,
          scrambleWord(wordSegments[index]?.text ?? '', random, pools),
        ]),
      );
      const wordCount = wordIndexes.length;
      const partsAt = (step: number): readonly TypewriterFramePart[] => {
        const currentStep = Math.max(0, Math.min(wordCount * 2, Math.floor(step)));
        const correctedCount = Math.max(0, currentStep - wordCount);
        const revealedCount = currentStep <= wordCount ? currentStep : wordCount;
        return wordSegments.map((segment, index) => {
          if (!segment.isWordLike) return { kind: 'literal', text: segment.text };
          const wordIndex = wordIndexes.indexOf(index);
          if (wordIndex < correctedCount)
            return { kind: 'word', text: segment.text, anchor: segment.text };
          if (wordIndex < revealedCount) {
            return {
              kind: 'word',
              text: scrambledWords.get(index) ?? segment.text,
              anchor: segment.text,
            };
          }
          return { kind: 'word', text: '', anchor: segment.text };
        });
      };
      return {
        stepCount: wordCount * 2,
        durationMs: safeDurationMs,
        granularity: 'word',
        framePartsAt: partsAt,
        frameAt: (step) =>
          partsAt(step)
            .map((part) => part.text)
            .join(''),
      };
    }
  }

  const pools = createScramblePools(graphemes, locale);
  const scrambled = graphemes.map((grapheme) => scrambleGrapheme(grapheme, random, pools));
  const framePartsAt = (step: number): readonly TypewriterFramePart[] => {
    const currentStep = Math.max(0, Math.min(graphemes.length * 2, Math.floor(step)));
    if (currentStep <= graphemes.length) {
      return literalFrameParts(scrambled.slice(0, currentStep).join(''));
    }

    const correctedCount = currentStep - graphemes.length;
    return literalFrameParts(
      graphemes
        .map((grapheme, index) =>
          index < correctedCount ? grapheme : (scrambled[index] ?? grapheme),
        )
        .join(''),
    );
  };
  return {
    stepCount: graphemes.length * 2,
    durationMs: safeDurationMs,
    granularity: 'grapheme',
    framePartsAt,
    frameAt: (step) =>
      framePartsAt(step)
        .map((part) => part.text)
        .join(''),
  };
}
