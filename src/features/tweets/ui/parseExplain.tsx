import React from 'react';
import Explain from '../../blog/ui/mdx/Explain';

/**
 * 推文正文极小子集解析器。
 *
 * 设计目标：让作者能在推文 textarea 里直接写 `<Explain note="...">...</Explain>`
 * 句级注解，渲染端把它解析为 React 节点，复用 MDX 的 Explain 组件；
 * 其余任何 `<` `>` 字符按文本处理（不是 HTML/JSX）。
 *
 * 不允许嵌套：lazy `?` 自然规避；嵌套 `<Explain>` 中的内层会作为外层
 * children 的纯文本被吃掉。
 */

export type TweetTextSegment =
  { type: 'text'; value: string } | { type: 'explain'; note: string; children: string };

// 严格子集：只识别 <Explain note="..."> ... </Explain>。
// note 必须是双引号；children 是惰性匹配的纯文本（含换行）。
const EXPLAIN_RE = /<Explain\s+note="([^"]*)">([\s\S]*?)<\/Explain>/g;

/**
 * 简易实体解码（仅 quote/amp/lt/gt/apos）。作者在 note 或 children 中可写
 * `&quot;` `&amp;` 等避开真值符号，但不强制。
 */
function decodeEntities(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function parseTweetSegments(input: string): TweetTextSegment[] {
  if (!input) return [];

  const segments: TweetTextSegment[] = [];
  // 正则带 g 标志，复用同一实例时记得 reset lastIndex —— 这里每次新建。
  const re = new RegExp(EXPLAIN_RE.source, EXPLAIN_RE.flags);
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const [full, rawNote, rawChildren] = match;
    const start = match.index;

    if (start > cursor) {
      segments.push({ type: 'text', value: input.slice(cursor, start) });
    }
    segments.push({
      type: 'explain',
      note: decodeEntities(rawNote),
      children: decodeEntities(rawChildren),
    });
    cursor = start + full.length;
  }

  if (cursor < input.length) {
    segments.push({ type: 'text', value: input.slice(cursor) });
  }

  return segments;
}

/**
 * 把 segments 拍平成纯字符串。<Explain> 段返回 children——
 * 这是打字机阶段的目标文本，避免逐字打出含 `<` 标签的源码。
 */
export function getTweetPlainText(segments: TweetTextSegment[]): string {
  let out = '';
  for (const seg of segments) {
    if (seg.type === 'text') out += seg.value;
    else out += seg.children;
  }
  return out;
}

/**
 * 把 segments 渲染为 React 节点。打字机结束后挂载这棵树，
 * Explain 触发器上的 reveal 动画自动播放。
 */
export function renderTweetSegments(segments: TweetTextSegment[]): React.ReactNode {
  if (segments.length === 0) return null;
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
        }
        return (
          <Explain key={idx} note={seg.note}>
            {seg.children}
          </Explain>
        );
      })}
    </>
  );
}

/** 是否含至少一个可解析的 Explain 段。 */
export function hasExplain(segments: TweetTextSegment[]): boolean {
  return segments.some((seg) => seg.type === 'explain');
}
