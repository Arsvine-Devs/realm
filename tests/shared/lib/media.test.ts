import { describe, expect, it } from 'vitest';
import {
  avatar,
  buildManagedAssetUrl,
  cover,
  gallery,
  isManagedMediaKey,
  music,
  post,
} from '@/shared/lib/media';

describe('media helpers', () => {
  it('allows only realm and shared namespaces', () => {
    expect(isManagedMediaKey('realm/images/post/2026/07/08/demo.hash.png')).toBe(true);
    expect(isManagedMediaKey('/shared/fonts/google-fonts.css')).toBe(true);
    expect(isManagedMediaKey('mayrain/images/post/demo.png')).toBe(false);
  });

  it('uses actual public media paths and protects the namespace', () => {
    expect(buildManagedAssetUrl('realm/images/example picture.png')).toBe(
      '/media/realm/images/example%20picture.png',
    );
    expect(() => buildManagedAssetUrl('realm/../../api')).toThrow();
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
