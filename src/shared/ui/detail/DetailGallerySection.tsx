import type { ReactNode } from 'react';

interface DetailGallerySectionProps {
  styles: Record<string, string>;
  sectionRef: (element: HTMLElement | null) => void;
  className: string;
  title?: string;
  contentClassName?: string;
  children: ReactNode;
}

export default function DetailGallerySection({
  styles,
  sectionRef,
  className,
  title,
  contentClassName,
  children,
}: DetailGallerySectionProps) {
  return (
    <section className={className} ref={sectionRef} data-nav-id="archive">
      {title && <h2 className={styles.sectionHeader}>{title}</h2>}
      {contentClassName ? <div className={contentClassName}>{children}</div> : children}
    </section>
  );
}
