import type { Project } from '../../../../shared/types';

interface WebProjectMetaSectionProps {
  highlights: string[];
  sectionRef: (element: HTMLElement | null) => void;
  project: Project;
  styles: Record<string, string>;
  tDetail: (key: string) => string;
  visible: Set<number>;
  setRef: (index: number) => (element: HTMLElement | null) => void;
  highlightRevealIndices: number[];
}

export default function WebProjectMetaSection({
  highlights,
  sectionRef,
  project,
  styles,
  tDetail,
  visible,
  setRef,
  highlightRevealIndices,
}: WebProjectMetaSectionProps) {
  return (
    <section className={styles.metaSection} ref={sectionRef} data-nav-id="meta">
      <h2 className={styles.sectionHeader}>{tDetail('projectMeta')}</h2>
      <div className={styles.metaGrid}>
        {project.year && (
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>{tDetail('year')}</span>
            <span className={styles.metaValue}>{project.year}</span>
          </div>
        )}
        {project.role && (
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>{tDetail('role')}</span>
            <span className={styles.metaValue}>{project.role}</span>
          </div>
        )}
        {project.status && (
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>{tDetail('status')}</span>
            <span className={`${styles.metaValue} ${styles.statusBadge}`}>
              {project.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {project.tech.length > 0 && (
        <div className={styles.techRow}>
          {project.tech.map((tag) => (
            <span key={tag} className={styles.techPill}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {highlights.length > 0 && (
        <div className={styles.highlightBlock}>
          <span className={styles.metaLabel}>{tDetail('keyHighlights')}</span>
          <ul className={styles.highlightList}>
            {highlights.map((highlight, index) => {
              const revealIndex = highlightRevealIndices[index];
              return (
                <li
                  key={`${highlight}-${index}`}
                  className={`${styles.highlightItem} ${visible.has(revealIndex) ? styles.visible : ''}`}
                  data-reveal-idx={revealIndex}
                  ref={setRef(revealIndex)}
                >
                  <span className={styles.highlightMarker}>›</span>
                  {highlight}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
