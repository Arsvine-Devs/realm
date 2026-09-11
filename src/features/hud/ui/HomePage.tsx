'use client';

import { useCallback } from 'react';
import { useHudAnimation, useHudColumnHover, useHudPower } from '../model/HudProvider';
import { useTransition } from '../../navigation/model/TransitionProvider';
import NavigationColumns from './layout/NavigationColumns';
import type { Locale } from '@/shared/contracts/locale';
import useNavigationIntentPrefetch from '@/features/navigation/model/useNavigationIntentPrefetch';

interface HomeProps {
  locale: Locale;
  messages: Record<string, unknown>;
}

export default function Home({ locale }: HomeProps) {
  const prefetchOnIntent = useNavigationIntentPrefetch();
  const { navigateTo } = useTransition();
  const {
    linesAnimated,
    pulsingNormalIndices,
    pulsingReverseIndices,
    textVisible,
    animationsComplete,
    columnPhase,
  } = useHudAnimation();
  const { isInverted } = useHudPower();
  const {
    randomHudTexts,
    branchText1,
    branchText2,
    branchText3,
    branchText4,
    handleColumnMouseEnter,
    handleColumnMouseLeave,
  } = useHudColumnHover();

  const handleColumnNavigateIntent = useCallback(() => {
    prefetchOnIntent(`/${locale}/content`);
  }, [locale, prefetchOnIntent]);

  const handleColumnClick = (columnIndex: number) => {
    if (!animationsComplete) return;
    const sectionHashes = ['works', 'experience', 'blog', 'life', 'contact', 'about'];
    if (columnIndex < sectionHashes.length) {
      navigateTo(`/${locale}/content#${sectionHashes[columnIndex]}`);
    }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <NavigationColumns
        activeSection="home"
        linesAnimated={linesAnimated}
        pulsingNormalIndices={pulsingNormalIndices}
        pulsingReverseIndices={pulsingReverseIndices}
        textVisible={textVisible}
        animationsComplete={animationsComplete}
        isInverted={isInverted}
        columnPhase={columnPhase}
        randomHudTexts={randomHudTexts}
        branchText1={branchText1}
        branchText2={branchText2}
        branchText3={branchText3}
        branchText4={branchText4}
        handleColumnClick={handleColumnClick}
        handleColumnNavigateIntent={handleColumnNavigateIntent}
        handleColumnMouseEnter={handleColumnMouseEnter}
        handleColumnMouseLeave={handleColumnMouseLeave}
      />
    </div>
  );
}
