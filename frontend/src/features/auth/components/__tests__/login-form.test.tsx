// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createProtectedActionIntent } from '@/utils/auth/protected-action-intent';

import { LoginForm } from '../login-form';

const { loginMock, navigateMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('../../queries/auth.mutations', () => ({
  useLoginMutation: () => ({ mutateAsync: loginMock, isPending: false, error: null }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: navigateMock }),
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    search?: Record<string, unknown>;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} data-search={search ? JSON.stringify(search) : undefined} {...props}>
      {children}
    </a>
  ),
}));

const fillLogin = async (password = ' exact password ') => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), 'person@example.com');
  await user.type(screen.getByLabelText('Password'), password);
  return user;
};

beforeEach(() => {
  loginMock.mockReset();
  navigateMock.mockReset();
  navigateMock.mockResolvedValue(undefined);
  sessionStorage.clear();
});

afterEach(cleanup);

describe('LoginForm', () => {
  it('validates on submit and focuses the first invalid field', async () => {
    render(<LoginForm />);

    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Email')));
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('toggles password visibility without changing its value', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    await user.type(input, ' unchanged ');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    expect(input.value).toBe(' unchanged ');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('submits the exact password once and returns through a matching intent', async () => {
    const intentId = '92f3f96b-c1ee-4d74-97cb-e0230767276b';
    createProtectedActionIntent(
      { kind: 'orders', payload: {} },
      {
        storage: sessionStorage,
        createId: () => intentId,
        now: () => Date.now(),
        origin: window.location.origin,
      },
    );
    loginMock.mockResolvedValue({});
    render(<LoginForm intentId={intentId} redirectTo='/account/profile' />);
    const user = await fillLogin();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(loginMock.mock.calls[0][0]).toMatchObject({
      email: 'person@example.com',
      password: ' exact password ',
    });
    expect(navigateMock).toHaveBeenCalledWith({ href: '/orders', replace: true });
  });

  it('uses controlled 401 feedback, preserves email, and focuses the alert', async () => {
    loginMock.mockRejectedValue({
      error: true,
      message: 'Inactive account',
      code: 'INACTIVE',
      httpStatus: 401,
      isNetworkError: false,
    });
    render(<LoginForm />);
    const user = await fillLogin('password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('The email or password you entered is incorrect.');
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('person@example.com');
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it('shows plain-language guidance for a network failure', async () => {
    loginMock.mockRejectedValue({
      error: true,
      message: 'socket detail',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
    });
    render(<LoginForm />);
    const user = await fillLogin('password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Unable to reach Tooang. Check your connection and try again.')).toBeTruthy();
  });

  it('announces completed registration without putting personal data in the page state', () => {
    render(<LoginForm registrationComplete />);

    expect(screen.getByText('Your account is ready')).toBeTruthy();
    expect(screen.getByText('Sign in with your new credentials to continue.')).toBeTruthy();
  });

  it('shows Retry-After guidance and carries the safe flow to registration', async () => {
    loginMock.mockRejectedValue({
      error: true,
      message: 'Rate limited',
      code: 'RATE_LIMITED',
      httpStatus: 429,
      retryAfterSeconds: 65,
      isNetworkError: false,
    });
    const intentId = '92f3f96b-c1ee-4d74-97cb-e0230767276b';
    render(<LoginForm intentId={intentId} redirectTo='/orders?status=ready' />);
    const user = await fillLogin('password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Too many sign-in attempts. Try again in 2 minutes.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('data-search')).toBe(
      JSON.stringify({ redirect: '/orders?status=ready', intent: intentId }),
    );
  });

  it('prevents rapid duplicate submissions while the first request is pending', async () => {
    let resolveLogin: (value: unknown) => void = () => undefined;
    loginMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    render(<LoginForm />);
    await fillLogin('password');
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form')!;

    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    resolveLogin({});
  });
});
