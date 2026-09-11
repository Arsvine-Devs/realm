import React from 'react';
import styles from './ProjectCard.module.scss';
import { resolveImageUrl } from '@/shared/lib/cdn';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { AssetReference } from '@/shared/types';

interface ProjectCardItem {
  id: string | number;
  title: string;
  description: string;
  tech: string[];
  link?: string;
  imageUrl: AssetReference;
  invertedImageUrl?: AssetReference;
  role?: string;
  year?: string;
  isConfidential?: boolean;
  liveUrl?: string;
}

interface ProjectCardProps<T extends ProjectCardItem> {
  project: T;
  onClick?: (project: T, event: MouseEvent<HTMLElement>) => void;
  onNavigateIntent?: (project: T) => void;
  isInverted: boolean;
}

function ProjectCard<T extends ProjectCardItem>({
  project,
  onClick,
  onNavigateIntent,
  isInverted,
}: ProjectCardProps<T>) {
  const {
    title,
    description,
    tech,
    link,
    imageUrl,
    invertedImageUrl,
    role,
    year,
    isConfidential,
    liveUrl,
  } = project;

  const resolvedImageUrl = isInverted && invertedImageUrl ? invertedImageUrl : imageUrl;
  const backgroundImageUrl = resolveImageUrl(resolvedImageUrl, 'card');
  const imageStyle = backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : {};

  const handleCardClick = (e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(project, e as MouseEvent<HTMLElement>);
    } else if (link && link !== '#') {
      window.open(link, '_blank', 'noopener noreferrer');
    }
  };

  const isClickable = !!onClick || (link && link !== '#');

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the card contains nested external anchors and keeps its documented keyboard handler.
    <div
      className={`${styles.projectCard} ${isClickable ? styles.clickable : ''} ${isConfidential ? styles.confidentialCard : ''}`}
      onClick={isClickable ? handleCardClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      data-cursor-no-magnetic
      onPointerDown={
        isClickable && onNavigateIntent
          ? (event) => {
              if (event.button === 0) onNavigateIntent(project);
            }
          : undefined
      }
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onNavigateIntent?.(project);
                handleCardClick(e);
              }
            }
          : undefined
      }
    >
      <div className={styles.cardBorderTopLeft}></div>
      <div className={styles.cardBorderBottomRight}></div>

      <div className={styles.projectImageContainer}>
        {isConfidential && !resolvedImageUrl ? (
          <div className={`${styles.projectImagePlaceholder} ${styles.confidentialPlaceholder}`}>
            <span className={styles.confidentialIcon}>🔒</span>
            <span className={styles.confidentialLabel}>CONFIDENTIAL</span>
          </div>
        ) : (
          <div className={styles.projectImagePlaceholder} style={imageStyle}>
            <div className={styles.imageScanlineOverlay}></div>
          </div>
        )}
      </div>

      <div className={styles.projectContent}>
        {(role || year) && (
          <div className={styles.projectMeta}>
            {year && <span className={styles.projectYear}>{year}</span>}
            {role && <span className={styles.projectRole}>{role}</span>}
          </div>
        )}
        <h3 className={styles.projectTitle}>
          <span className={styles.titleBracket}>[</span>
          {title}
          <span className={styles.titleBracket}>]</span>
        </h3>
        <p className={styles.projectDescription}>{description}</p>
        <div className={styles.projectTech}>
          {tech.map((item: string, index: number) => (
            <span key={index} className={styles.techTag}>
              {item}
            </span>
          ))}
        </div>
      </div>
      {liveUrl && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.projectLink}
          onClick={(e) => e.stopPropagation()}
          data-cursor-magnetic
        >
          Visit
        </a>
      )}
      {!liveUrl && !onClick && link && link !== '#' && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.projectLink}
          onClick={(e) => e.stopPropagation()}
          data-cursor-magnetic
        >
          Visit
        </a>
      )}
    </div>
  );
}

export default React.memo(ProjectCard) as typeof ProjectCard;
