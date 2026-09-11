import type { MouseEventHandler } from 'react';
import type { DetailSectionNavItem } from '@/shared/hooks/useDetailSectionNav';

interface DetailRailNavProps {
  styles: Record<string, string>;
  isPastHero: boolean;
  activeNav: string;
  navItems: DetailSectionNavItem[];
  onBack: MouseEventHandler<HTMLButtonElement>;
  onNavigateSection: (id: string) => void;
}

export default function DetailRailNav({
  styles,
  isPastHero,
  activeNav,
  navItems,
  onBack,
  onNavigateSection,
}: DetailRailNavProps) {
  return (
    <nav className={`${styles.rightNav} ${isPastHero ? styles.visible : ''}`}>
      <button
        className={styles.rightNavBack}
        onClick={onBack}
        data-cursor-label="BACK"
        aria-label="BACK"
      />
      <div className={styles.rightNavDivider} />
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`${styles.rightNavLink} ${activeNav === item.id ? styles.active : ''}`}
          onClick={() => onNavigateSection(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
