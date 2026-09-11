import type { RefObject } from 'react';
import styles from '../styles/ExperienceSection.module.scss';
import type { ExperienceItem } from '../../../shared/types';

interface ExperienceSectionProps {
  experienceSectionRef: RefObject<HTMLDivElement | null>;
  experienceData: ExperienceItem[];
  handleExperienceItemClick: (item: ExperienceItem) => void;
}

export default function ExperienceSection({
  experienceSectionRef,
  experienceData,
  handleExperienceItemClick,
}: ExperienceSectionProps) {
  return (
    <div
      id="experience-section"
      ref={experienceSectionRef}
      className={`${styles.contentSection} ${styles.experienceSection}`}
    >
      <h2 className={styles.experienceTitleWithBackground}>EXPERIENCE</h2>
      <div className={styles.experienceTimeline}>
        {experienceData.map((item: ExperienceItem, index: number) => (
          <div
            key={item.id}
            className={`
              ${styles.timelineItem}
              ${item.alignment === 'left' ? styles.timelineItemLeft : styles.timelineItemRight}
            ${item.type === 'education' ? styles.educationItem : ''}
            `}
            /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the timeline item contains block layout that cannot be placed inside a button. */
            role="button"
            tabIndex={0}
            aria-label={item.title}
            onClick={() => handleExperienceItemClick(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleExperienceItemClick(item);
              }
            }}
          >
            <div className={styles.timelinePoint} />
            <div className={styles.timelineBranch} />
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <span className={styles.timelineYear}>{item.duration}</span>
                <h3>{item.title}</h3>
              </div>
              {item.details && item.details.length > 0 && (
                <div className={styles.timelineDetails}>
                  {item.details.map((detail: string, i: number) => (
                    <p
                      key={i}
                      className={
                        item.type === 'education' && index === 0 && (i === 0 || i === 1)
                          ? styles.timelineNumber
                          : ''
                      }
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
