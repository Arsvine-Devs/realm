import { type MouseEvent, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../styles/LifeSection.module.scss';
import ProjectCard from '../../../shared/ui/ProjectCard';
import type { LifeItem } from '../../../shared/types';
import { useHudPower } from '../../hud/model/HudProvider';
import { useLocaleStableState } from '@/features/navigation/model/LocalePageState';

interface LifeSectionProps {
  lifeSectionRef: RefObject<HTMLDivElement | null>;
  activeSection: string;
  activeLifeTab: string;
  handleLifeTabClick: (tab: string) => void;
  lifeContentAreaRef: RefObject<HTMLDivElement | null>;
  lifeGameTabRef: RefObject<HTMLDivElement | null>;
  lifeTravelTabRef: RefObject<HTMLDivElement | null>;
  lifeArtTabRef: RefObject<HTMLDivElement | null>;
  lifeOtherTabRef: RefObject<HTMLDivElement | null>;
  gameData: LifeItem[];
  travelData: LifeItem[];
  otherData: LifeItem[];
  alsoPlayGames: string[];
  artPlaceholderText: string;
  handleLifeItemClick: (item: LifeItem, event: MouseEvent<HTMLElement>) => void;
  handleLifeItemIntent?: (item: LifeItem) => void;
}

export default function LifeSection({
  lifeSectionRef,
  activeSection,
  activeLifeTab,
  handleLifeTabClick,
  lifeContentAreaRef,
  lifeGameTabRef,
  lifeTravelTabRef,
  lifeArtTabRef,
  lifeOtherTabRef,
  gameData,
  travelData,
  otherData,
  alsoPlayGames,
  artPlaceholderText,
  handleLifeItemClick,
  handleLifeItemIntent,
}: LifeSectionProps) {
  const { isInverted } = useHudPower();
  const [alsoPlayExpanded, setAlsoPlayExpanded] = useLocaleStableState(
    'content.life.also-play-expanded',
    false,
  );
  const t = useTranslations('sections.life');

  return (
    <div
      id="life-section"
      ref={lifeSectionRef}
      className={`${styles.contentSection} ${styles.lifeSection} ${activeSection === 'lifeDetail' ? styles.detailActive : ''}`}
    >
      <h2 className={styles.lifeTitleWithBackground}>LIFE</h2>
      <div className={styles.lifeTabButtons}>
        <button
          className={`${styles.lifeTabButton} ${activeLifeTab === 'game' ? styles.activeTab : ''}`}
          onClick={() => handleLifeTabClick('game')}
        >
          {t('tabGame')}
        </button>
        <button
          className={`${styles.lifeTabButton} ${activeLifeTab === 'travel' ? styles.activeTab : ''}`}
          onClick={() => handleLifeTabClick('travel')}
        >
          {t('tabTravel')}
        </button>
        <button
          className={`${styles.lifeTabButton} ${activeLifeTab === 'art' ? styles.activeTab : ''}`}
          onClick={() => handleLifeTabClick('art')}
        >
          {t('tabArt')}
        </button>
        <button
          className={`${styles.lifeTabButton} ${activeLifeTab === 'other' ? styles.activeTab : ''}`}
          onClick={() => handleLifeTabClick('other')}
        >
          {t('tabOther')}
        </button>
      </div>
      <div ref={lifeContentAreaRef} className={styles.lifeContentArea}>
        {/* Game Tab */}
        <div
          ref={lifeGameTabRef}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'game' ? styles.activeContent : ''}`}
        >
          <div className={styles.gameGrid}>
            {gameData.map((game: LifeItem) => (
              <ProjectCard
                key={game.id}
                project={game}
                onClick={handleLifeItemClick}
                onNavigateIntent={handleLifeItemIntent}
                isInverted={isInverted}
              />
            ))}
          </div>
          <div className={styles.earlySection}>
            <button
              className={`${styles.earlySectionToggle} ${alsoPlayExpanded ? styles.expanded : ''}`}
              onClick={() => setAlsoPlayExpanded((prev) => !prev)}
            >
              <span className={styles.earlySectionToggleIcon}>{alsoPlayExpanded ? '▾' : '▸'}</span>
              <span>{t('alsoPlayThese')}</span>
              <span className={styles.earlySectionCount}>{alsoPlayGames.length}</span>
            </button>
            <div
              className={`${styles.earlySectionContent} ${alsoPlayExpanded ? styles.expanded : ''}`}
            >
              <div className={styles.smallGameGrid}>
                {alsoPlayGames.map((gameName: string) => (
                  <div key={gameName} className={styles.smallGameCard}>
                    {gameName}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Travel Tab */}
        <div
          ref={lifeTravelTabRef}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'travel' ? styles.activeContent : ''}`}
        >
          <div className={styles.travelGrid}>
            {travelData.map((place: LifeItem) => (
              <ProjectCard
                key={place.id}
                project={place}
                onClick={handleLifeItemClick}
                onNavigateIntent={handleLifeItemIntent}
                isInverted={isInverted}
              />
            ))}
          </div>
        </div>
        {/* Art Tab */}
        <div
          ref={lifeArtTabRef}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'art' ? styles.activeContent : ''}`}
        >
          <div className={styles.compactTextContainer}>
            <p>{artPlaceholderText}</p>
          </div>
        </div>
        {/* Other Tab */}
        <div
          ref={lifeOtherTabRef}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'other' ? styles.activeContent : ''} ${styles.compactTabContent}`}
        >
          <div className={styles.gameGrid}>
            {otherData.map((item: LifeItem) => (
              <ProjectCard
                key={item.id}
                project={item}
                onClick={handleLifeItemClick}
                onNavigateIntent={handleLifeItemIntent}
                isInverted={isInverted}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
