import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CheckIcon, UserIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchInput } from '@/components/ui/search-input';
import { StatusBadge } from '@/components/ui/status-badge';

import { usersQueryOptions } from '@/features/users/queries/users.query';
import { USER_SORT_BY, USER_SORT_ORDER, type UserSummary } from '@/features/users/types/users.type';

import { getDashboardErrorPresentation } from '@/utils/dashboard-error';
import { formatPlaceMemberRole } from '@/utils/dashboard-place';
import { cn } from '@/utils/utils';

import type { PlaceMember, PlaceMemberRole } from '../types/place-members.type';

export const MEMBER_USER_SEARCH_MIN_LENGTH = 2;
export const MEMBER_USER_SEARCH_LIMIT = 10;

type MembershipLookup = ReadonlyMap<string, PlaceMemberRole>;

const toMembershipLookup = (members: readonly PlaceMember[]): MembershipLookup =>
  new Map(members.map((member) => [member.user.userId, member.role]));

function MembershipNote({ currentRole, role }: { currentRole?: PlaceMemberRole; role: PlaceMemberRole }) {
  if (!currentRole) return null;
  if (currentRole === role) {
    return <StatusBadge tone='neutral'>Already {formatPlaceMemberRole(role).toLowerCase()}</StatusBadge>;
  }
  return (
    <span className='text-xs text-warning-foreground'>
      Currently {formatPlaceMemberRole(currentRole).toLowerCase()} — role will change
    </span>
  );
}

export function MemberUserResults({
  users,
  members,
  role,
  total,
  onSelect,
  disabled,
}: {
  users: readonly UserSummary[];
  members: readonly PlaceMember[];
  role: PlaceMemberRole;
  total: number;
  onSelect: (user: UserSummary) => void;
  disabled?: boolean;
}) {
  const memberships = useMemo(() => toMembershipLookup(members), [members]);

  if (users.length === 0) {
    return <EmptyState compact title='No matching active users' description='Try another name or email address.' />;
  }

  return (
    <div className='space-y-2'>
      <div role='radiogroup' aria-label='Matching users' className='max-h-80 space-y-1 overflow-y-auto'>
        {users.map((user) => {
          const currentRole = memberships.get(user.userId);
          const isSameRole = currentRole === role;
          return (
            <button
              key={user.userId}
              type='button'
              role='radio'
              aria-checked={false}
              disabled={disabled || isSameRole}
              onClick={() => onSelect(user)}
              className={cn(
                'flex min-h-11 w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                'hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
              )}
            >
              <UserIcon className='mt-0.5 size-4 shrink-0 text-muted-foreground' aria-hidden />
              <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='truncate font-medium'>{user.fullName}</span>
                <span className='truncate text-muted-foreground'>{user.email}</span>
                <span className='truncate font-mono text-xs text-muted-foreground'>{user.userId}</span>
                <MembershipNote currentRole={currentRole} role={role} />
              </span>
            </button>
          );
        })}
      </div>
      {total > users.length && (
        <p className='text-xs text-muted-foreground'>
          Showing {users.length} of {total} users. Refine your search to see more.
        </p>
      )}
    </div>
  );
}

export function SelectedMemberUser({
  user,
  members,
  role,
  onChange,
  disabled,
}: {
  user: UserSummary;
  members: readonly PlaceMember[];
  role: PlaceMemberRole;
  onChange: () => void;
  disabled?: boolean;
}) {
  const currentRole = members.find((member) => member.user.userId === user.userId)?.role;
  return (
    <div className='flex items-start gap-3 rounded-md border border-primary/30 bg-primary-subtle/40 p-3 text-sm'>
      <CheckIcon className='mt-0.5 size-4 shrink-0 text-primary' aria-hidden />
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='truncate font-medium'>{user.fullName}</span>
        <span className='truncate text-muted-foreground'>{user.email}</span>
        <span className='truncate font-mono text-xs text-muted-foreground'>{user.userId}</span>
        <MembershipNote currentRole={currentRole} role={role} />
      </div>
      <Button type='button' variant='outline' size='sm' onClick={onChange} disabled={disabled}>
        Change
      </Button>
    </div>
  );
}

export function MemberUserPicker({
  members,
  role,
  selectedUser,
  onSelect,
  disabled,
}: {
  members: readonly PlaceMember[];
  role: PlaceMemberRole;
  selectedUser?: UserSummary;
  onSelect: (user: UserSummary | undefined) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const term = debouncedSearch.trim();
  const canSearch = term.length >= MEMBER_USER_SEARCH_MIN_LENGTH;
  const query = useQuery({
    ...usersQueryOptions({
      search: term,
      limit: MEMBER_USER_SEARCH_LIMIT,
      sortBy: USER_SORT_BY.FULL_NAME,
      sortOrder: USER_SORT_ORDER.ASC,
    }),
    enabled: canSearch && !selectedUser,
  });

  if (selectedUser) {
    return (
      <SelectedMemberUser
        user={selectedUser}
        members={members}
        role={role}
        disabled={disabled}
        onChange={() => onSelect(undefined)}
      />
    );
  }

  const errorPresentation = getDashboardErrorPresentation(query.error);

  return (
    <div className='space-y-3'>
      <SearchInput
        autoFocus
        value={search}
        maxLength={100}
        disabled={disabled}
        onValueChange={setSearch}
        onDebouncedValueChange={setDebouncedSearch}
        placeholder='Search by name or email'
        aria-label='Search users by name or email'
      />
      {!canSearch ? (
        <p className='text-sm text-muted-foreground'>
          Type at least {MEMBER_USER_SEARCH_MIN_LENGTH} characters to search active users.
        </p>
      ) : query.isPending ? (
        <LoadingState compact label='Searching users' />
      ) : query.isError ? (
        <p role='alert' className='text-sm text-destructive'>
          {errorPresentation.description}
        </p>
      ) : (
        <MemberUserResults
          users={query.data.users}
          members={members}
          role={role}
          total={query.data.meta.totalItems ?? query.data.users.length}
          disabled={disabled}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
