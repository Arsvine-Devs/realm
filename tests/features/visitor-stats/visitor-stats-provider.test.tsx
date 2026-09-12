import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { useVisitorStats, VisitorStatsProvider } from '@/features/visitor-stats/public';

function Consumer() {
  const stats = useVisitorStats();
  return (
    <output>
      {stats.status}:{stats.totalVisitors ?? '--'}:{stats.todayVisitors ?? '--'}
    </output>
  );
}

function TestTree({ children }: { children?: ReactNode }) {
  return <VisitorStatsProvider>{children ?? <Consumer />}</VisitorStatsProvider>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('VisitorStatsProvider', () => {
  it('does not call the API on a non-canonical host', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    render(<TestTree />);

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('disabled:--:--'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits once and exposes validated production counts', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          enabled: true,
          tracked: true,
          totalVisitors: 17,
          todayVisitors: 5,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<TestTree />);

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('ready:17:5'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/visitor-stats',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    );
  });

  it('shows an error state without retrying when the API fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    render(<TestTree />);

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('error:--:--'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
