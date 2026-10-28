// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { usersService } from '@/features/users/services/users.service';
import type { UserSummary } from '@/features/users/types/users.type';

import { PlatformRole } from '@/types/enums/user-role.enum';

import type { PlaceMember } from '../../types/place-members.type';
import { MemberUserResults } from '../member-user-picker';
import { AssignMemberDrawer } from '../place-members-page';

const summary = (userId: string, fullName: string): UserSummary => ({
  userId,
  fullName,
  email: `${userId}@example.com`,
  platformRole: PlatformRole.USER,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const member = (user: UserSummary, role: PlaceMember['role']): PlaceMember => ({
  membershipId: `membership-${user.userId}`,
  placeId: 'place-1',
  user: { userId: user.userId, fullName: user.fullName, email: user.email },
  role,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  revokedAt: null,
});

const alice = summary('public-alice', 'Alice Owner');
const bob = summary('public-bob', 'Bob Cashier');
const carol = summary('public-carol', 'Carol New');

const renderDrawer = (canSearchUsers: boolean, members: PlaceMember[] = []) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AssignMemberDrawer
        placeId='place-1'
        role='OWNER'
        open
        onOpenChange={() => undefined}
        members={members}
        canSearchUsers={canSearchUsers}
      />
    </QueryClientProvider>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('member user results', () => {
  it('blocks users who already hold the role and flags role changes', () => {
    render(
      <MemberUserResults
        users={[alice, bob, carol]}
        members={[member(alice, 'OWNER'), member(bob, 'CASHIER')]}
        role='OWNER'
        total={3}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByRole('radio', { name: /Alice Owner/ })).toBeDisabled();
    expect(screen.getByText('Already owner')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Bob Cashier/ })).toBeEnabled();
    expect(screen.getByText('Currently cashier — role will change')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Carol New/ })).toBeEnabled();
  });

  it('asks to refine the search when more users match than are shown', () => {
    render(<MemberUserResults users={[carol]} members={[]} role='OWNER' total={25} onSelect={() => undefined} />);

    expect(screen.getByText('Showing 1 of 25 users. Refine your search to see more.')).toBeInTheDocument();
  });
});

describe('assign member drawer', () => {
  it('keeps the manual public user ID input without user search access', () => {
    const list = vi.spyOn(usersService, 'list');
    renderDrawer(false);

    expect(screen.getByLabelText('Public user ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('Search users by name or email')).not.toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('searches users and confirms the owner assignment by name', async () => {
    const list = vi.spyOn(usersService, 'list').mockResolvedValue({
      users: [carol],
      meta: { totalItems: 1 },
    });
    const user = userEvent.setup();
    renderDrawer(true);

    expect(screen.queryByLabelText('Public user ID')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Search users by name or email'), 'car');
    await user.click(await screen.findByRole('radio', { name: /Carol New/ }));

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ search: 'car', limit: 10 }));
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Assign owner' }));

    expect(
      await screen.findByText(/This grants OWNER access to Carol New \(public-carol@example\.com\)/),
    ).toBeInTheDocument();
  });
});
