// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RegisterForm } from '../register-form';

const { navigateMock, registerMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  registerMock: vi.fn(),
}));

vi.mock('../../queries/auth.mutations', () => ({
  useRegisterMutation: () => ({ mutateAsync: registerMock, isPending: false, error: null }),
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

const fillRegistration = async (password = ' exact password ') => {
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Dian Erdiana' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dian@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: password } });
  return user;
};

beforeEach(() => {
  navigateMock.mockReset();
  navigateMock.mockResolvedValue(undefined);
  registerMock.mockReset();
});

afterEach(cleanup);

describe('RegisterForm', () => {
  it('focuses the first invalid field and exposes an error summary', async () => {
    render(<RegisterForm />);
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);

    expect(await screen.findByText('Check your details')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Full name')));
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('toggles each password field independently without altering values', async () => {
    render(<RegisterForm />);
    const user = userEvent.setup();
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    const confirmation = screen.getByLabelText('Confirm password') as HTMLInputElement;
    await user.type(password, ' unchanged ');
    await user.type(confirmation, ' unchanged ');

    const showButtons = screen.getAllByRole('button', { name: 'Show password' });
    await user.click(showButtons[0]);
    expect(password.type).toBe('text');
    expect(confirmation.type).toBe('password');
    expect(password.value).toBe(' unchanged ');
  });

  it('registers without auto-login and hands the complete safe flow to login', async () => {
    registerMock.mockResolvedValue({});
    const intentId = '92f3f96b-c1ee-4d74-97cb-e0230767276b';
    render(<RegisterForm intentId={intentId} redirectTo='/orders?status=ready' />);
    const user = await fillRegistration();
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
    expect(registerMock.mock.calls[0][0]).toEqual({
      fullName: 'Dian Erdiana',
      email: 'dian@example.com',
      password: ' exact password ',
    });
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/login',
      search: { redirect: '/orders?status=ready', intent: intentId, registered: true },
      replace: true,
    });
  });

  it.each([
    [
      {
        error: true,
        message: 'Sensitive duplicate detail',
        code: 'CONFLICT',
        httpStatus: 409,
        isNetworkError: false,
      },
      'An account with this email already exists.',
      'Email',
    ],
    [
      {
        error: true,
        message: 'Sensitive password detail',
        code: 'COMMON_PASSWORD',
        httpStatus: 400,
        isNetworkError: false,
      },
      'Choose a less common password and try again.',
      'Password',
    ],
  ])('maps controlled field failures and retains entered values %#', async (error, message, label) => {
    registerMock.mockRejectedValue(error);
    render(<RegisterForm />);
    const user = await fillRegistration();
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    const affected = screen.getByLabelText(label);
    await waitFor(() => expect(document.activeElement).toBe(affected));
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Dian Erdiana');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(' exact password ');
  });

  it('shows generic 429 guidance when Retry-After is unavailable', async () => {
    registerMock.mockRejectedValue({
      error: true,
      message: 'Rate limited',
      code: 'RATE_LIMITED',
      httpStatus: 429,
      isNetworkError: false,
    });
    render(<RegisterForm />);
    const user = await fillRegistration('password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Too many registration attempts. Wait a moment and try again.');
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it('prevents rapid duplicate submissions while registration is pending', async () => {
    let resolveRegistration: (value: unknown) => void = () => undefined;
    registerMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRegistration = resolve;
        }),
    );
    render(<RegisterForm />);
    await fillRegistration('password');
    const form = screen.getByRole('button', { name: 'Create account' }).closest('form')!;

    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1));
    resolveRegistration({});
  });
});
