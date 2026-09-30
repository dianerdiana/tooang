// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { api } from '@/configs/api-config';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';

import { PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { usersService } from '../../services/users.service';
import { CustomerProfilePage } from '../customer-profile-page';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  navigate: vi.fn(),
  setTheme: vi.fn(),
  theme: 'light' as 'light' | 'dark' | 'system',
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  user: null as AuthenticatedUser | null,
}));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));

vi.mock('@/utils/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: mocks.user !== null,
    isInitialLoading: false,
    login: vi.fn(),
    logout: mocks.logout,
    register: vi.fn(),
    user: mocks.user,
  }),
}));

vi.mock('@/utils/hooks/use-theme', () => ({
  useTheme: () => ({ theme: mocks.theme, setTheme: mocks.setTheme }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mocks.navigate }),
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; search?: unknown }) => {
    const { search, ...anchorProps } = props;
    void search;
    return (
      <a href={to} {...anchorProps}>
        {children}
      </a>
    );
  },
}));

const user: AuthenticatedUser = {
  userId: '123e4567-e89b-42d3-a456-426614174000',
  fullName: 'Dian Erdiana',
  email: 'dian@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ, PERMISSION.PROFILE_UPDATE, PERMISSION.ACCOUNT_DELETION_REQUEST],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const renderPage = (currentUser: AuthenticatedUser = user) => {
  mocks.user = currentUser;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(AUTH_SESSION_QUERY_KEY, currentUser);
  render(
    <QueryClientProvider client={client}>
      <CustomerProfilePage />
    </QueryClientProvider>,
  );
  return client;
};

afterEach(() => {
  cleanup();
  mocks.user = null;
  mocks.theme = 'light';
  vi.restoreAllMocks();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('customer profile page', () => {
  it('renders safe identity and customer account navigation without role internals', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Your profile' })).toBeTruthy();
    expect(screen.getByLabelText('Full name')).toHaveProperty('value', user.fullName);
    expect(screen.getByLabelText('Email')).toHaveProperty('value', user.email);
    expect(screen.getByText(/Member since/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'My orders' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'My reviews' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toBeTruthy();
    expect(document.body.textContent).not.toContain(user.userId);
    expect(document.body.textContent).not.toMatch(/platform role|permissions|memberships/i);
  });

  it('hides dashboard entry without effective dashboard capability and updates theme', async () => {
    renderPage({
      ...user,
      permissions: [PERMISSION.PROFILE_UPDATE, PERMISSION.ACCOUNT_DELETION_REQUEST],
    });

    expect(screen.queryByRole('link', { name: 'Open dashboard' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(mocks.setTheme).toHaveBeenCalledWith('dark');
  });

  it('normalizes profile edits and synchronizes the shared session cache', async () => {
    const updated = {
      userId: user.userId,
      fullName: 'Updated Name',
      email: 'new@example.com',
      platformRole: user.platformRole,
      createdAt: user.createdAt,
      updatedAt: '2026-09-30T08:00:00.000Z',
    };
    const update = vi.spyOn(usersService, 'updateMe').mockResolvedValue(updated);
    const client = renderPage();

    const fullName = screen.getByLabelText('Full name');
    const email = screen.getByLabelText('Email');
    await userEvent.clear(fullName);
    await userEvent.type(fullName, '  Updated Name  ');
    await userEvent.clear(email);
    await userEvent.type(email, 'NEW@EXAMPLE.COM');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ fullName: 'Updated Name', email: 'new@example.com' }));
    expect(client.getQueryData(AUTH_SESSION_QUERY_KEY)).toMatchObject({
      fullName: 'Updated Name',
      email: 'new@example.com',
      permissions: user.permissions,
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Profile updated');
  });

  it('focuses invalid profile input and preserves duplicate-email input after a 409', async () => {
    vi.spyOn(usersService, 'updateMe').mockRejectedValue({
      error: true,
      message: 'Conflict',
      code: 'CONFLICT',
      httpStatus: 409,
      isNetworkError: false,
    });
    renderPage();

    const fullName = screen.getByLabelText('Full name');
    await userEvent.clear(fullName);
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);
    expect((await screen.findAllByText('Full name is required')).length).toBe(2);
    await waitFor(() => expect(document.activeElement).toBe(fullName));

    await userEvent.type(fullName, 'Dian Erdiana');
    const email = screen.getByLabelText('Email');
    await userEvent.clear(email);
    await userEvent.type(email, 'used@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Email unavailable')).toBeTruthy();
    expect(email).toHaveProperty('value', 'used@example.com');
    await waitFor(() => expect(document.activeElement).toBe(email));
  });

  it('keeps deletion confirmation open and explains lifecycle conflicts safely', async () => {
    vi.spyOn(usersService, 'requestAccountDeletion').mockRejectedValue({
      error: true,
      message: 'The last active SUPER_ADMIN cannot request account deletion',
      code: 'CONFLICT',
      httpStatus: 409,
      isNetworkError: false,
    });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Request account deletion' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Keep account' })).toBe(document.activeElement);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Request deletion' }));

    expect(await within(dialog).findByText('Account deletion is currently blocked')).toBeTruthy();
    expect(dialog.textContent).not.toContain('SUPER_ADMIN');
  });

  it('clears private state and routes to the public confirmation after deletion acceptance', async () => {
    vi.spyOn(usersService, 'requestAccountDeletion').mockResolvedValue({
      userId: user.userId,
      status: 'DELETION_PENDING',
      deletionRequestedAt: '2026-09-30T08:00:00.000Z',
    });
    const removeToken = vi.spyOn(api, 'removeToken').mockImplementation(() => undefined);
    const client = renderPage();
    client.setQueryData(['orders', 'list', 'own'], { orders: [] });

    await userEvent.click(screen.getByRole('button', { name: 'Request account deletion' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Request deletion' }));

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/account/deletion-requested', replace: true }),
    );
    expect(removeToken).toHaveBeenCalledOnce();
    expect(client.getQueryData(AUTH_SESSION_QUERY_KEY)).toBeNull();
    expect(client.getQueryData(['orders', 'list', 'own'])).toBeUndefined();
  });

  it('keeps the confirmation stable and blocks duplicate deletion submissions', async () => {
    let resolveRequest!: (value: { userId: string; status: 'DELETION_PENDING'; deletionRequestedAt: string }) => void;
    const request = vi.spyOn(usersService, 'requestAccountDeletion').mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    vi.spyOn(api, 'removeToken').mockImplementation(() => undefined);
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Request account deletion' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Request deletion' }));

    const pendingAction = within(dialog).getByRole('button', { name: 'Requesting…' });
    expect(pendingAction.hasAttribute('disabled')).toBe(true);
    expect(pendingAction.getAttribute('aria-busy')).toBe('true');
    expect(request).toHaveBeenCalledOnce();

    resolveRequest({
      userId: user.userId,
      status: 'DELETION_PENDING',
      deletionRequestedAt: '2026-09-30T08:00:00.000Z',
    });
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/account/deletion-requested', replace: true }),
    );
  });

  it('signs out locally and returns home even when server logout fails', async () => {
    mocks.logout.mockRejectedValueOnce(new Error('offline'));
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/', replace: true }));
    expect(mocks.toastError).toHaveBeenCalledWith(
      'You were signed out locally, but Tooang could not reach the server.',
    );
  });
});
