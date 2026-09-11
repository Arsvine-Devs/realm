'use client';

/* eslint-disable @next/next/no-img-element -- friend avatars are arbitrary remote URLs and should remain plain img elements */
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../../app/shell/SectionPageLayout';
import styles from '../styles/ProfileSections.module.scss';
import type { Locale } from '@/shared/contracts/locale';
import { resolveRawAssetUrl } from '@/shared/lib/cdn';
import type { FriendLink, ServiceCredit } from '../../../shared/types';

export interface FriendsPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  friends: FriendLink[];
  services?: { items: ServiceCredit[] };
  pageTitle: string;
  pageDescription: string;
}

export default function FriendsPage({
  friends,
  services,
  pageTitle,
  pageDescription,
}: FriendsPageProps) {
  const t = useTranslations('pages.friends');
  return (
    <SectionPageLayout>
      <div className={styles.friendLinkSection}>
        <h2>{t('heading')}</h2>
        <div className={styles.friendLinkGrid}>
          {friends.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.friendLinkCard}
              data-cursor-label="VISIT"
            >
              <div className={styles.friendLinkAvatar}>
                <img src={resolveRawAssetUrl(link.avatar)} alt={link.name} />
              </div>
              <div className={styles.friendLinkInfo}>
                <h3>{link.name}</h3>
                <p>{link.description}</p>
              </div>
            </a>
          ))}
        </div>

        {services && services.items.length > 0 && (
          <>
            <h2 className={styles.friendLinkServicesHeading}>{t('servicesHeading')}</h2>
            <div className={styles.friendLinkGrid}>
              {services.items.map((svc) => (
                <a
                  key={svc.url}
                  href={svc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.friendLinkCard}
                  data-cursor-label="VISIT"
                >
                  <div className={styles.friendLinkAvatar}>
                    <img src={resolveRawAssetUrl(svc.avatar)} alt={svc.name} />
                  </div>
                  <div className={styles.friendLinkInfo}>
                    <h3>{svc.name}</h3>
                    <p>{svc.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </SectionPageLayout>
  );
}
