import { useEffect, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../styles/WorksSection.module.scss';
import { useSafeTimeouts } from '../../../shared/hooks/useSafeTimeouts';
import ProjectCard from '../../../shared/ui/ProjectCard';
import SkillTree from '../../../shared/ui/SkillTree';
import type { Project, SkillCategory } from '../../../shared/types';
import { useHudPower } from '../../hud/model/HudProvider';
import { useLocaleStableState } from '@/features/navigation/model/LocalePageState';

const WORK_TAB_TRANSITION_MS = 180;

interface WorksSectionProps {
  worksSectionRef: RefObject<HTMLDivElement | null>;
  activeWorkTab: string;
  handleWorkTabClick: (tab: string) => void;
  workContentAreaRef: RefObject<HTMLDivElement | null>;
  webTabRef: RefObject<HTMLDivElement | null>;
  gameTabRef: RefObject<HTMLDivElement | null>;
  webProjects: Project[];
  gameProjects: Project[];
  earlyProjects: Project[];
  handleWorkItemClick: (project: Project, e: React.MouseEvent) => void;
  handleWorkItemIntent?: (project: Project) => void;
  skillCategories: SkillCategory[];
}

function WorksSection({
  worksSectionRef,
  activeWorkTab,
  handleWorkTabClick,
  workContentAreaRef,
  webTabRef,
  gameTabRef,
  webProjects,
  gameProjects,
  earlyProjects,
  handleWorkItemClick,
  handleWorkItemIntent,
  skillCategories,
}: WorksSectionProps) {
  const { isInverted } = useHudPower();
  const [earlyExpanded, setEarlyExpanded] = useLocaleStableState(
    'content.works.early-expanded',
    false,
  );
  const [skillsExpanded, setSkillsExpanded] = useLocaleStableState(
    'content.works.skills-expanded',
    false,
  );
  const [displayedWorkTab, setDisplayedWorkTab] = useState(activeWorkTab);
  const [tabTransitionStage, setTabTransitionStage] = useState<'idle' | 'fadeOut' | 'fadeIn'>(
    'idle',
  );
  const safeTimers = useSafeTimeouts();
  const t = useTranslations('sections.works');
  const activeProjects = displayedWorkTab === 'web' ? webProjects : gameProjects;
  const activeTabRef = displayedWorkTab === 'web' ? webTabRef : gameTabRef;

  useEffect(() => {
    if (activeWorkTab === displayedWorkTab) {
      return;
    }

    let fadeInTimeoutId: number | undefined;
    const fadeOutTimeoutId = safeTimers.setTimeout(() => {
      setTabTransitionStage('fadeOut');
      setDisplayedWorkTab(activeWorkTab);
      setTabTransitionStage('fadeIn');
      fadeInTimeoutId = safeTimers.setTimeout(() => {
        setTabTransitionStage('idle');
      }, WORK_TAB_TRANSITION_MS);
    }, WORK_TAB_TRANSITION_MS);

    return () => {
      safeTimers.clearTimeout(fadeOutTimeoutId);
      safeTimers.clearTimeout(fadeInTimeoutId);
    };
  }, [activeWorkTab, displayedWorkTab, safeTimers]);

  return (
    <div
      id="works-section"
      ref={worksSectionRef}
      className={`${styles.contentSection} ${styles.worksSection}`}
    >
      <h2 className={styles.worksTitleWithBackground}>PORTFOLIO</h2>
      <div className={styles.workTabButtons}>
        <button
          className={`${styles.workTabButton} ${activeWorkTab === 'web' ? styles.activeTab : ''}`}
          onClick={() => handleWorkTabClick('web')}
        >
          {t('tabWeb')}
        </button>
        <button
          className={`${styles.workTabButton} ${activeWorkTab === 'game' ? styles.activeTab : ''}`}
          onClick={() => handleWorkTabClick('game')}
        >
          {t('tabGame')}
        </button>
      </div>
      <div ref={workContentAreaRef} className={styles.workContentArea}>
        <div
          ref={activeTabRef}
          className={`${styles.workTabContent} ${styles.activeWorkContent} ${
            tabTransitionStage === 'fadeOut'
              ? styles.workTabContentFadeOut
              : tabTransitionStage === 'fadeIn'
                ? styles.workTabContentFadeIn
                : ''
          }`}
        >
          <div className={styles.projectGrid}>
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={handleWorkItemClick}
                onNavigateIntent={handleWorkItemIntent}
                isInverted={isInverted}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 早期学习折叠区 */}
      {earlyProjects.length > 0 && (
        <div className={styles.earlySection}>
          <button
            className={`${styles.earlySectionToggle} ${earlyExpanded ? styles.expanded : ''}`}
            onClick={() => setEarlyExpanded((prev) => !prev)}
          >
            <span className={styles.earlySectionToggleIcon}>{earlyExpanded ? '▾' : '▸'}</span>
            <span>{t('earlyWorks')}</span>
            <span className={styles.earlySectionCount}>{earlyProjects.length}</span>
          </button>
          <div className={`${styles.earlySectionContent} ${earlyExpanded ? styles.expanded : ''}`}>
            <div className={styles.projectGrid}>
              {earlyProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={handleWorkItemClick}
                  onNavigateIntent={handleWorkItemIntent}
                  isInverted={isInverted}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.earlySection}>
        <button
          className={`${styles.earlySectionToggle} ${skillsExpanded ? styles.expanded : ''}`}
          onClick={() => setSkillsExpanded((prev) => !prev)}
        >
          <span className={styles.earlySectionToggleIcon}>{skillsExpanded ? '▾' : '▸'}</span>
          <span>{t('skillsProficiency')}</span>
          <span className={styles.earlySectionCount}>
            {skillCategories.reduce((sum, cat) => sum + cat.skills.length, 0)}
          </span>
        </button>
        <div className={`${styles.earlySectionContent} ${skillsExpanded ? styles.expanded : ''}`}>
          <SkillTree categories={skillCategories} expanded={skillsExpanded} />
        </div>
      </div>
    </div>
  );
}

export default WorksSection;
