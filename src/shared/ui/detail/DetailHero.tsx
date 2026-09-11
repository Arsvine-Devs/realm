import type { RefObject } from 'react';
import { AnimatedTitleChars } from '../AnimatedTitleChars';

interface DetailHeroProps {
  styles: Record<string, string>;
  title: string;
  subtitle: string;
  subtitleDone: boolean;
  titleRef: RefObject<HTMLHeadingElement | null>;
  heroBgRef: RefObject<HTMLDivElement | null>;
  sectionRef: (element: HTMLElement | null) => void;
  backgroundImage?: string;
  compact?: boolean;
}

export default function DetailHero({
  styles,
  title,
  subtitle,
  subtitleDone,
  titleRef,
  heroBgRef,
  sectionRef,
  backgroundImage,
  compact = false,
}: DetailHeroProps) {
  const className = compact ? styles.compactHeader : styles.hero;
  const titleClassName = compact ? styles.compactTitle : styles.heroTitle;

  return (
    <section className={className} ref={sectionRef} data-nav-id="hero">
      {!compact && (
        <>
          <div
            ref={heroBgRef}
            className={styles.heroBg}
            style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
          />
          <div className={styles.heroScanlines} />
          <div className={styles.heroOverlay} />
        </>
      )}
      <div className={styles.heroContent}>
        <h1 ref={titleRef} className={titleClassName}>
          <AnimatedTitleChars
            text={title}
            wrapperClassName={styles.charWrapper}
            innerClassName={styles.charInner}
            wordWrapperClassName={styles.wordWrapper}
          />
        </h1>
        <p className={styles.heroSubtitle}>
          {subtitle}
          {!subtitleDone && <span className={styles.heroCursor} />}
        </p>
      </div>
    </section>
  );
}
