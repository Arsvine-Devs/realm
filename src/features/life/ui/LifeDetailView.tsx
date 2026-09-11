import React from 'react';
import styles from '../styles/LifeDetailView.module.scss';
import Lightbox from '../../../shared/ui/Lightbox';
import LazyImage from '../../../shared/ui/LazyImage';
import useGalleryLightbox from '@/shared/hooks/useGalleryLightbox';
import { resolveImageUrl } from '@/shared/lib/cdn';
import type { GalleryImage, LifeItem } from '../../../shared/types';

const LifeDetailView = ({ item }: { item: LifeItem | null }) => {
  const { title, description, tech, imageUrl, articleContent, galleryImages } = item || {};
  const backgroundImageUrl = resolveImageUrl(imageUrl, 'large');
  const imageStyle = backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : {};

  const paragraphs = articleContent ? articleContent.split('\n\n') : [];
  const imagesForGallery = galleryImages || [];
  const {
    isLightboxOpen,
    currentLightboxImageIndex,
    clickedThumbnailRect,
    bindThumbnailRef,
    openLightbox,
    closeLightbox,
    showNextImage,
    showPrevImage,
    getClosingRect,
  } = useGalleryLightbox(imagesForGallery.length);

  if (!item) return null;

  return (
    <div className={styles.detailContainer}>
      {/* 返回按钮 (已移除) 
      <button className={styles.backButton} onClick={onBack}>
        ← BACK
      </button>
      */}

      <h3 className={styles.detailTitle}>{title}</h3>

      <div className={styles.detailContent}>
        <div className={styles.detailImageContainer}>
          <div className={styles.detailImage} style={imageStyle}>
            {!backgroundImageUrl && <span>Image not available</span>} {/* 无主图时显示占位文本 */}
            <div className={styles.imageScanlineOverlay}></div> {/* 图片扫描线覆盖层 */}
          </div>
        </div>

        <div className={styles.detailText}>
          <p className={styles.detailDescription}>{description}</p>

          {/* 渲染文章内容，并在段落间插入图片/链接 */}
          {articleContent && (
            <div className={styles.articleSection}>
              {paragraphs.map((paragraph: string, index: number) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}

          {/* 相关图片缩略图展示区域 */}
          {imagesForGallery.length > 0 && (
            <div className={styles.relatedImagesSection}>
              <h4 className={styles.relatedImagesTitle}>Gallery</h4>
              <div className={styles.thumbnailGrid}>
                {imagesForGallery.map((img: GalleryImage, idx: number) => (
                  // Changed index to idx to avoid conflict
                  <button
                    key={`thumb_btn_${idx}`}
                    className={styles.thumbnailButton}
                    onClick={(e) => openLightbox(idx, e, 'thumb')} // Pass sourceType, use idx
                    ref={bindThumbnailRef(`thumb_${idx}`)}
                  >
                    <LazyImage
                      src={img.src}
                      alt={img.caption || `${title} thumbnail ${idx + 1}`}
                      className={styles.thumbnailImage}
                      quality="low"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 技术标签展示区域 */}
          {tech && tech.length > 0 && (
            <div className={styles.detailTechContainer}>
              <span className={styles.techLabel}>Tags:</span>
              <div className={styles.detailTechTags}>
                {tech.map((tag: string, index: number) => (
                  <span key={index} className={styles.detailTechTag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 灯箱组件 (当 isLightboxOpen 为 true 且有图片对象时渲染) */}
      {isLightboxOpen && imagesForGallery.length > 0 && (
        <Lightbox
          image={imagesForGallery[currentLightboxImageIndex]}
          onClose={closeLightbox}
          onPrev={imagesForGallery.length > 1 ? showPrevImage : null}
          onNext={imagesForGallery.length > 1 ? showNextImage : null}
          thumbnailRect={clickedThumbnailRect}
          currentIndex={currentLightboxImageIndex}
          totalImages={imagesForGallery.length}
          getClosingRectForIndex={getClosingRect} // CHANGED prop name to pass the new function
        />
      )}
    </div>
  );
};

export default LifeDetailView;
