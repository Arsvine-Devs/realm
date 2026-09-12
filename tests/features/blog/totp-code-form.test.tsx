import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TotpCodeForm from '@/features/blog/ui/blog/TotpCodeForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      tokenLabel: 'Token',
      hint: 'Enter the current token.',
      verifying: 'Verifying',
      invalidToken: 'Invalid token',
    })[key] ?? key,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TotpCodeForm', () => {
  it('submits a complete token and forwards the safe redirect', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, redirectTo: '/en/blog/secret' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const onVerified = vi.fn();

    render(
      <TotpCodeForm
        group="family"
        nextPath="/en/blog/secret"
        inputId="token"
        onVerified={onVerified}
      />,
    );

    fireEvent.change(screen.getByLabelText('Token'), { target: { value: '123456' } });

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('/en/blog/secret'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/protected-verify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ group: 'family', token: '123456', next: '/en/blog/secret' }),
      }),
    );
  });

  it('shows the server error without calling the success callback', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: { message: 'Wrong token' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const onVerified = vi.fn();

    render(
      <TotpCodeForm
        group="family"
        nextPath="/en/blog/secret"
        inputId="token"
        onVerified={onVerified}
      />,
    );
    fireEvent.change(screen.getByLabelText('Token'), { target: { value: '123456' } });

    expect(await screen.findByText('Wrong token')).toBeTruthy();
    expect(onVerified).not.toHaveBeenCalled();
  });
});
