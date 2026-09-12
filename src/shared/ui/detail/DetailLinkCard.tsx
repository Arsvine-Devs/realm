import type { ReactNode } from 'react';

interface DetailLinkCardProps {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  styles: Record<string, string>;
  ariaLabel?: string;
}

export default function DetailLinkCard({
  href,
  title,
  subtitle,
  icon,
  styles,
  ariaLabel,
}: DetailLinkCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.linkCard}
      aria-label={ariaLabel}
    >
      <div className={styles.linkIconWrap}>{icon}</div>
      <div className={styles.linkInfo}>
        <span className={styles.linkTitle}>{title}</span>
        <span className={styles.linkSub}>{subtitle}</span>
      </div>
    </a>
  );
}
