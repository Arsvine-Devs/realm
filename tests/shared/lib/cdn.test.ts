import { describe, expect, it } from 'vitest';
import {
  avatar,
  buildImagePictureSources,
  buildImageUrl,
  buildManagedAssetUrl,
  cover,
  gallery,
  hasAllowedCdnNamespace,
  music,
  normalizeCdnBase,
  post,
} from '@/shared/lib/cdn';

describe('cdn helpers', () => {
  it('normalizes the CDN base before URL generation', () => {
    expect(normalizeCdnBase('https://cdn.arsvine.com/')).toBe('https://cdn.arsvine.com');
  });

  it('allows only realm and shared namespaces', () => {
    expect(hasAllowedCdnNamespace('realm/images/post/2026/07/08/demo.hash.png')).toBe(true);
    expect(hasAllowedCdnNamespace('/shared/fonts/google-fonts.css')).toBe(true);
    expect(hasAllowedCdnNamespace('mayrain/images/post/demo.png')).toBe(false);
  });

  it('builds image URLs only from fixed EO preset mappings', () => {
    expect(buildImageUrl('realm/images/post/2026/07/08/demo.hash.png', 'card')).toBe(
      'https://cdn.arsvine.com/realm/images/post/2026/07/08/demo.hash.png?eo-img.resize=w/720&eo-img.format=webp',
    );
  });

  it('builds AVIF + WebP picture sources for supported presets', () => {
    expect(buildImagePictureSources('realm/images/post/2026/07/08/demo.hash.png', 'large')).toEqual(
      {
        avifUrl:
          'https://cdn.arsvine.com/realm/images/post/2026/07/08/demo.hash.png?eo-img.resize=l/1800&eo-img.format=avif',
        webpUrl:
          'https://cdn.arsvine.com/realm/images/post/2026/07/08/demo.hash.png?eo-img.resize=l/1800&eo-img.format=webp',
      },
    );
  });

  it('keeps raw managed assets free of EO query parameters', () => {
    expect(buildManagedAssetUrl('shared/fonts/google-fonts.css')).toBe(
      'https://cdn.arsvine.com/shared/fonts/google-fonts.css',
    );
  });

  it('keeps static-data helpers as stable catalog identities', () => {
    expect(cover('arsvine-realm-preview.webp')).toEqual({
      catalogKey: 'covers/arsvine-realm-preview.webp',
    });
    expect(gallery('photo-ujs-5.webp')).toEqual({ catalogKey: 'gallery/photo-ujs-5.webp' });
    expect(post('arsvine-realm-screenshot-1.png')).toEqual({
      catalogKey: 'posts/arsvine-realm-screenshot-1.png',
    });
    expect(post('arsvine-realm-screenshot-2.png')).toEqual({
      catalogKey: 'posts/arsvine-realm-screenshot-2.png',
    });
    expect(post('endfield-planner-screenshot-1.png')).toEqual({
      catalogKey: 'posts/endfield-planner-screenshot-1.png',
    });
    expect(avatar('avatar-arning-1.webp')).toEqual({ catalogKey: 'avatar/avatar-arning-1.webp' });
    expect(music('dont-be-so-serious.m4a')).toEqual({ catalogKey: 'music/dont-be-so-serious.m4a' });
  });
});
