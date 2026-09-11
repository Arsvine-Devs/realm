import type { ReactNode } from 'react';

interface RevealParagraphSectionProps {
  styles: Record<string, string>;
  sectionRef: (element: HTMLElement | null) => void;
  sectionId: string;
  className: string;
  itemClassName: string;
  textClassName: string;
  paragraphs: string[];
  title: string;
  visible: Set<number>;
  setRef: (index: number) => (element: HTMLElement | null) => void;
  revealIndices: number[];
  renderParagraph?: (paragraph: string, index: number) => ReactNode;
}

export default function RevealParagraphSection({
  styles,
  sectionRef,
  sectionId,
  className,
  itemClassName,
  textClassName,
  paragraphs,
  title,
  visible,
  setRef,
  revealIndices,
  renderParagraph,
}: RevealParagraphSectionProps) {
  return (
    <section className={className} ref={sectionRef} data-nav-id={sectionId}>
      <h2 className={styles.sectionHeader}>{title}</h2>
      {paragraphs.map((paragraph, index) => {
        const revealIndex = revealIndices[index];
        return (
          <div
            key={`${sectionId}-${index}`}
            className={`${itemClassName} ${visible.has(revealIndex) ? (styles.visible ?? '') : ''}`}
            data-reveal-idx={revealIndex}
            ref={setRef(revealIndex)}
          >
            <p className={textClassName}>
              {renderParagraph ? renderParagraph(paragraph, index) : paragraph}
            </p>
          </div>
        );
      })}
    </section>
  );
}
