import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from '../../../../app/styles/Shell.module.scss';
import VerticalShinyText from '../../../../shared/ui/VerticalShinyText';
import ActivationLever from '../ActivationLever';
import { useHudAnimation, useHudPower, useHudTyping } from '../../model/HudProvider';
import { useReducedMotion, useResponsive } from '@/shared/hooks/useMediaQuery';
import type { ColumnPhase } from '@/features/hud/contracts/state';

const sectionNames = ['PORTFOLIO', 'EXPERIENCE', 'BLOG', 'LIFE', 'CONTACT', 'ABOUT'];

interface NavigationColumnsProps {
  activeSection: string;
  linesAnimated: boolean;
  pulsingNormalIndices: number[] | null;
  pulsingReverseIndices: number[] | null;
  textVisible: boolean;
  animationsComplete: boolean;
  isInverted: boolean;
  columnPhase: ColumnPhase;
  randomHudTexts: string[];
  branchText1: string;
  branchText2: string;
  branchText3: string;
  branchText4: string;
  handleColumnClick: (index: number) => void;
  handleColumnNavigateIntent?: (index: number) => void;
  handleColumnMouseEnter: (index: number) => void;
  handleColumnMouseLeave: (index: number) => void;
}

export default function NavigationColumns({
  activeSection,
  linesAnimated,
  pulsingNormalIndices,
  pulsingReverseIndices,
  textVisible,
  animationsComplete,
  isInverted,
  columnPhase,
  randomHudTexts,
  branchText1,
  branchText2,
  branchText3,
  branchText4,
  handleColumnClick,
  handleColumnNavigateIntent,
  handleColumnMouseEnter,
  handleColumnMouseLeave,
}: NavigationColumnsProps) {
  const {
    handleActivateTesseract,
    isTesseractActivated,
    handleDischargeLeverPull,
    isDischarging,
    powerLevel,
  } = useHudPower();
  const { leversVisible, mainVisible } = useHudAnimation();
  const { displayedFateText, accessibleFateText, isFateTypingActive } = useHudTyping();
  const { isMobile } = useResponsive();
  const reducedMotion = useReducedMotion();

  const rightPanelRef = useRef<HTMLDivElement>(null);
  const chargeLeverLabel = isTesseractActivated ? 'CHARGING' : 'START CHARGE';
  const dischargeLeverLabel = isDischarging
    ? 'DISCHARGING'
    : powerLevel === 100
      ? 'DISCHARGE'
      : 'FULL CHARGE REQUIRED';

  useEffect(() => {
    if (!mainVisible || reducedMotion) return;
    if (!isMobile || !rightPanelRef.current) return;

    const panel = rightPanelRef.current;
    const mobilePanel = panel.querySelector(`.${styles.mobilePanel}`);
    const columns = panel.querySelectorAll(`.${styles.column}`);

    const tl = gsap.timeline();

    if (mobilePanel) {
      gsap.set(mobilePanel, { opacity: 0, y: -12 });
      tl.to(mobilePanel, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0);
    }

    columns.forEach((col, i) => {
      gsap.set(col, { opacity: 0, x: 30, scale: 0.97 });
      tl.to(
        col,
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.35,
          ease: 'power2.out',
        },
        0.2 + i * 0.09,
      );
    });

    return () => {
      tl.kill();
      if (mobilePanel) gsap.set(mobilePanel, { clearProps: 'all' });
      columns.forEach((col) => gsap.set(col, { clearProps: 'all' }));
    };
  }, [mainVisible, isMobile, reducedMotion]);

  return (
    <main className={styles.mainLayout} style={{ opacity: 1, pointerEvents: 'auto' }}>
      {/* 导航列（桌面端垂直列 / 平板移动端横向条） */}
      <div
        className={`${styles.rightPanel}${columnPhase === 'retracting' ? ` ${styles.columnsRetracting}` : ''}`}
        ref={rightPanelRef}
      >
        {/* 移动端面板 — 桌面端 LeftPanel 完整移植 */}
        <div className={styles.mobilePanel}>
          {/* 顶部行: 电量 + 拉杆 */}
          <div className={styles.mobilePanelTopRow}>
            <div className={styles.mobilePanelPower}>
              <div className={styles.batteryIcon}>
                {[...Array(5)].map((_, i) => {
                  const shouldBeFilled = powerLevel >= (i + 1) * 20;
                  const isFilled = (i === 4 && powerLevel === 100) || shouldBeFilled;
                  return (
                    <span
                      key={i}
                      className={`${styles.batteryLevelSegment} ${isFilled ? styles.filled : ''}`}
                    />
                  );
                })}
              </div>
              <span className={styles.powerText}>{powerLevel}%</span>
            </div>
            <div className={styles.mobilePanelLevers}>
              {mainVisible && (
                <>
                  <ActivationLever
                    onActivate={handleActivateTesseract}
                    isActive={isTesseractActivated}
                    iconType="discharge"
                    isAnimated={leversVisible}
                    cursorLabel={chargeLeverLabel}
                  />
                  <ActivationLever
                    onActivate={handleDischargeLeverPull}
                    isActive={isDischarging}
                    iconType="drain"
                    isAnimated={leversVisible}
                    cursorLabel={dischargeLeverLabel}
                  />
                </>
              )}
            </div>
          </div>

          {/* RM Logo — 弹性填充中央区域 */}
          <div className={styles.mobilePanelLogo} />

          {/* 底部行: 盲文(左) + 命运文字(右) */}
          <div className={styles.mobilePanelBottomRow}>
            <div className={styles.mobilePanelBraille}>⠝⠊⠕⠍⠡⠸⠬⠉⠄⠅⠢⠛⠳</div>
            <div
              className={`${styles.mobilePanelFate} ${isFateTypingActive ? styles.mobilePanelTyping : ''}`}
            >
              <span className={styles.mobilePanelFateText} aria-hidden="true">
                {displayedFateText}
              </span>
              {accessibleFateText ? (
                <span className="visually-hidden">{accessibleFateText}</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Vertical lines */}
        {[...Array(7)].map((_, index) => {
          const lineLeftPercentage = index * 16;
          const isPulsingNormal = pulsingNormalIndices?.includes(index);
          const isPulsingReverse = pulsingReverseIndices?.includes(index);
          return (
            <div
              key={`line-${index}`}
              className={`
                ${styles.verticalLine} 
                ${linesAnimated ? styles.animated : ''} 
                ${isPulsingNormal ? styles.pulsing : ''} 
                ${isPulsingReverse ? styles.pulsingReverse : ''}
              `}
              style={{ left: `${lineLeftPercentage}%` }}
            ></div>
          );
        })}

        {/* Navigation columns */}
        {sectionNames.map((name, index) => {
          const hudText = randomHudTexts[index + 1] || `DATA-Ø0${index + 1}`;

          const tasks = Array.from({ length: 30 }, (_, i) => {
            const taskNumber = String(i + 1).padStart(3, '0');
            return `TASK-${taskNumber}: Done`;
          });

          return (
            <div
              key={name}
              className={`${styles.column} ${styles['column' + index]} ${!animationsComplete ? styles.nonInteractive : ''}`}
              onClick={animationsComplete ? () => handleColumnClick(index) : undefined}
              onKeyDown={
                animationsComplete
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleColumnClick(index);
                      }
                    }
                  : undefined
              }
              onPointerDown={
                animationsComplete
                  ? (event) => {
                      if (event.button === 0) handleColumnNavigateIntent?.(index);
                    }
                  : undefined
              }
              onMouseEnter={() => handleColumnMouseEnter(index)}
              onMouseLeave={() => handleColumnMouseLeave(index)}
              /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the column contains composed HUD visuals and task rows. */
              role="button"
              tabIndex={animationsComplete ? 0 : -1}
              aria-label={name}
            >
              <div className={styles.verticalText}>
                {name.split('').map((char, charIdx) => {
                  const delay = `${charIdx * 0.005}s`;
                  return (
                    <div key={charIdx} className={styles.charItem}>
                      <VerticalShinyText
                        text={char}
                        textVisible={textVisible}
                        animationDelay={delay}
                        speed={0.8}
                      />
                    </div>
                  );
                })}
              </div>
              <div className={styles.hudOverlay}>
                {index === 0 && (
                  <div className={styles.taskContainer}>
                    {tasks.flatMap((task, taskIdx) => [
                      <div key={`task-${taskIdx}`} className={styles.taskItem}>
                        <span className={styles.taskSquare}></span>
                        <div className={styles.taskTextWrapper}>
                          <span className={styles.taskText}>{task}</span>
                        </div>
                      </div>,
                      taskIdx < tasks.length - 1 && (
                        <div key={`line-${taskIdx}`} className={styles.taskLine}></div>
                      ),
                    ])}
                  </div>
                )}
                {index === 1 && (
                  <>
                    <div
                      className={`${styles.branchContainer} ${styles.branch1} ${styles.rightBranch}`}
                    >
                      <span className={styles.branchSquare}></span>
                      <pre className={styles.branchText}>{branchText1}</pre>
                    </div>
                    <div
                      className={`${styles.branchContainer} ${styles.branch2} ${styles.leftBranch}`}
                    >
                      <span className={styles.branchSquare}></span>
                      <pre className={styles.branchText}>{branchText2}</pre>
                    </div>
                    <div
                      className={`${styles.branchContainer} ${styles.branch3} ${styles.rightBranch}`}
                    >
                      <span className={styles.branchSquare}></span>
                      <pre className={styles.branchText}>{branchText3}</pre>
                    </div>
                    <div
                      className={`${styles.branchContainer} ${styles.branch4} ${styles.leftBranch}`}
                    >
                      <span className={styles.branchSquare}></span>
                      <pre className={styles.branchText}>{branchText4}</pre>
                    </div>
                  </>
                )}
                {index === 3 && (
                  <span
                    className={`${styles.lifeScanlines} ${isInverted ? styles.invertedScanlines : ''}`}
                  ></span>
                )}
                {index === 4 && (
                  <>
                    <div className={`${styles.radarRipple} ${styles.ripple1}`}></div>
                    <div className={`${styles.radarRipple} ${styles.ripple2}`}></div>
                    <div className={`${styles.radarRipple} ${styles.ripple3}`}></div>
                  </>
                )}
              </div>
              <div className={styles.cornerHudTopLeft}></div>
              <div className={styles.cornerHudBottomRight}></div>
              <div className={styles.imageHud}>
                <span className={styles.imageHudSquare}></span>
                <span className={styles.imageHudText}>
                  {index === 5 ? randomHudTexts[0] : hudText}
                </span>
              </div>
              {index === 5 && (
                <>
                  {randomHudTexts.slice(1).map((text: string, randomIdx: number) => (
                    <div
                      key={`random-hud-${randomIdx}`}
                      className={`${styles.imageHud} ${styles.randomHud} ${styles[`randomHud${randomIdx + 1}`]}`}
                    >
                      <span className={styles.imageHudSquare}></span>
                      <span className={styles.imageHudText}>{text}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
