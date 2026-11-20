import { useId, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../styles/LifeSection.module.scss';
import ProjectCard from '../../../shared/ui/ProjectCard';
import type { LifeItem } from '../../../shared/types';
import type { Locale } from '@/shared/contracts/locale';
import { useHudPower } from '../../hud/model/HudProvider';
import { useLocaleStableState } from '@/features/navigation/model/LocalePageState';

interface LifeSectionProps {
  locale: Locale;
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
  handleLifeItemClick: (item: LifeItem) => void;
  handleLifeItemIntent?: (item: LifeItem) => void;
}

export default function LifeSection({
  locale,
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
  const gamesId = useId();
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
          inert={activeLifeTab !== 'game'}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'game' ? styles.activeContent : ''}`}
        >
          <div className={styles.gameGrid}>
            {gameData.map((game: LifeItem) => (
              <ProjectCard
                key={game.id}
                project={game}
                href={`/${locale}/life/${game.id}`}
                onClick={handleLifeItemClick}
                onNavigateIntent={handleLifeItemIntent}
                isInverted={isInverted}
              />
            ))}
          </div>
          <div className={styles.earlySection}>
            <button
              type="button"
              aria-expanded={alsoPlayExpanded}
              aria-controls={gamesId}
              className={`${styles.earlySectionToggle} ${alsoPlayExpanded ? styles.expanded : ''}`}
              onClick={() => setAlsoPlayExpanded((prev) => !prev)}
            >
              <span className={styles.earlySectionToggleIcon}>{alsoPlayExpanded ? '▾' : '▸'}</span>
              <span>{t('alsoPlayThese')}</span>
              <span className={styles.earlySectionCount}>{alsoPlayGames.length}</span>
            </button>
            <div
              id={gamesId}
              inert={!alsoPlayExpanded}
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
          inert={activeLifeTab !== 'travel'}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'travel' ? styles.activeContent : ''}`}
        >
          <div className={styles.travelGrid}>
            {travelData.map((place: LifeItem) => (
              <ProjectCard
                key={place.id}
                project={place}
                href={`/${locale}/life/${place.id}`}
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
          inert={activeLifeTab !== 'art'}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'art' ? styles.activeContent : ''}`}
        >
          <div className={styles.compactTextContainer}>
            <p>{artPlaceholderText}</p>
          </div>
        </div>
        {/* Other Tab */}
        <div
          ref={lifeOtherTabRef}
          inert={activeLifeTab !== 'other'}
          className={`${styles.lifeTabContent} ${activeLifeTab === 'other' ? styles.activeContent : ''} ${styles.compactTabContent}`}
        >
          <div className={styles.gameGrid}>
            {otherData.map((item: LifeItem) => (
              <ProjectCard
                key={item.id}
                project={item}
                href={`/${locale}/life/${item.id}`}
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
