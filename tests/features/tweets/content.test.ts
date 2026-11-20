// The timeline is sourced from the published Content service.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchPublishedTweetIndexMock, fetchPublishedTweetMonthMock } = vi.hoisted(() => ({
  fetchPublishedTweetIndexMock: vi.fn(),
  fetchPublishedTweetMonthMock: vi.fn(),
}));

vi.mock('@/shared/lib/content/content-api', () => ({
  fetchPublishedTweetIndex: fetchPublishedTweetIndexMock,
  fetchPublishedTweetMonth: fetchPublishedTweetMonthMock,
}));

import { getTweetMonthGroupsPage } from '@/features/tweets/server/content';

describe('published Content tweet source', () => {
  beforeEach(() => {
    fetchPublishedTweetIndexMock.mockReset();
    fetchPublishedTweetMonthMock.mockReset();
  });

  it('loads only the requested months and retains the total', async () => {
    fetchPublishedTweetIndexMock.mockResolvedValue({
      months: [
        { month: '2026-07', path: 'tweets/2026-07.json' },
        { month: '2026-06', path: 'tweets/2026-06.json' },
      ],
    });
    fetchPublishedTweetMonthMock.mockImplementation((month: string) =>
      month === '2026-07'
        ? Promise.resolve({
            month,
            tweets: [
              {
                id: 'available',
                createdAt: '2026-07-01T00:00:00+08:00',
                content: 'Available month',
                visibility: 'public',
              },
            ],
          })
        : Promise.reject(new Error('month unavailable')),
    );

    await expect(getTweetMonthGroupsPage(0, 1)).resolves.toEqual({
      monthGroups: [
        expect.objectContaining({
          month: '2026-07',
          tweets: [expect.objectContaining({ id: 'available' })],
        }),
      ],
      totalMonths: 2,
    });
    expect(fetchPublishedTweetMonthMock).toHaveBeenCalledExactlyOnceWith('2026-07');
  });

  it('reports upstream errors without presenting an empty timeline', async () => {
    fetchPublishedTweetIndexMock.mockResolvedValue({ months: { month: '2026-07' } });

    await expect(getTweetMonthGroupsPage(0, 1)).rejects.toThrow(
      'Invalid published tweet index shape',
    );
  });

  it('keeps a valid X origin alongside the normalized tweet', async () => {
    fetchPublishedTweetIndexMock.mockResolvedValue({
      months: [{ month: '2026-09', path: 'tweets/2026-09.json' }],
    });
    fetchPublishedTweetMonthMock.mockResolvedValue({
      month: '2026-09',
      tweets: [
        {
          id: '20260912-001',
          createdAt: '2026-09-12T00:00:00+08:00',
          content: 'Imported from X',
          origin: {
            provider: 'x',
            externalId: '1346889436626259968',
            canonicalUrl: 'https://x.com/XDevelopers/status/1346889436626259968',
            authorId: '2244994945',
            authorUsername: 'XDevelopers',
            importedAt: '2026-09-12T08:00:00+08:00',
          },
        },
      ],
    });

    await expect(getTweetMonthGroupsPage(0, 1)).resolves.toMatchObject({
      monthGroups: [
        {
          tweets: [expect.objectContaining({ origin: expect.objectContaining({ provider: 'x' }) })],
        },
      ],
    });
  });

  it('reports an invalid month response', async () => {
    fetchPublishedTweetIndexMock.mockResolvedValue({
      months: [{ month: '2026-09', path: 'tweets/2026-09.json' }],
    });
    fetchPublishedTweetMonthMock.mockResolvedValue({
      month: '2026-09',
      tweets: [
        {
          id: '20260912-001',
          createdAt: '2026-09-12T00:00:00+08:00',
          content: 'Invalid source',
          origin: { provider: 'x', externalId: 'not-a-post-id' },
        },
      ],
    });

    await expect(getTweetMonthGroupsPage(0, 1)).rejects.toThrow('Invalid tweets for 2026-09');
  });
});
