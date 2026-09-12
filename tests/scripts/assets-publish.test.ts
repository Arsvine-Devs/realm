import { describe, expect, it } from 'vitest';

import { assertRemoteObjectListed, redactCliSecrets } from '../../scripts/assets/publish.mjs';

describe('assets-publish helpers', () => {
  it('redacts every supported COS credential flag', () => {
    expect(redactCliSecrets('coscli -i secret-id -k secret-key --token session-token ls')).toBe(
      'coscli -i [REDACTED] -k [REDACTED] --token [REDACTED] ls',
    );
  });

  it('accepts a listing containing the expected object key', () => {
    expect(() =>
      assertRemoteObjectListed(
        { stdout: 'realm/site-catalog/versions/20260718T000000Z/assets.json' },
        'public-bucket',
        'realm/site-catalog/versions/20260718T000000Z/assets.json',
      ),
    ).not.toThrow();
  });

  it('rejects an empty successful listing', () => {
    expect(() =>
      assertRemoteObjectListed(
        { stdout: '' },
        'private-bucket',
        'realm/catalog/versions/20260718T000000Z/static-assets.json',
      ),
    ).toThrow(
      'verification failed: missing cos://private-bucket/realm/catalog/versions/20260718T000000Z/static-assets.json',
    );
  });
});
