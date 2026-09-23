import { type FormEvent, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpDownIcon, SearchIcon, UsersIcon, UserXIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layouts/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { isApplicationError } from '@/utils/api-error.util';
import { usePermissions } from '@/utils/hooks/use-permissions';

import { PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';

import { useDeactivateUserMutation } from '../queries/users.mutation';
import { usersQueryOptions } from '../queries/users.query';
import {
  type NormalizedUserListParams,
  USER_SORT_BY,
  USER_SORT_ORDER,
  type UserSortBy,
  type UserSortOrder,
  type UserSummary,
} from '../types/users.type';

type UserManagementPageProps = {
  filters: NormalizedUserListParams;
  onFiltersChange: (filters: NormalizedUserListParams) => void;
};

type UserCollectionProps = {
  users: UserSummary[];
  canDeactivate: boolean;
  pendingUserId?: string;
  failedUserId?: string;
  mutationError?: unknown;
  onDeactivate: (user: UserSummary) => void;
};

const rolePresentation: Record<PlatformRole, { label: string; tone: StatusBadgeTone }> = {
  [PlatformRole.USER]: { label: 'User', tone: 'neutral' },
  [PlatformRole.ADMIN]: { label: 'Admin', tone: 'primary' },
  [PlatformRole.SUPER_ADMIN]: { label: 'Super admin', tone: 'warning' },
};

const sortLabels: Record<UserSortBy, string> = {
  [USER_SORT_BY.CREATED_AT]: 'Created date',
  [USER_SORT_BY.FULL_NAME]: 'Full name',
  [USER_SORT_BY.EMAIL]: 'Email',
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const deactivationErrorMessage = (error: unknown) => {
  if (!isApplicationError(error)) return 'Unable to deactivate this account. Please try again.';
  if (error.httpStatus === 403 || error.httpStatus === 409) return error.message;
  if (error.httpStatus === 404) return 'This active user no longer exists. Refresh the list and try again.';
  if (error.isNetworkError) return 'Could not reach the server. Check your connection and try again.';
  return error.message || 'Unable to deactivate this account. Please try again.';
};

function PlatformRoleBadge({ role }: { role: PlatformRole }) {
  const presentation = rolePresentation[role];
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>;
}

function DeactivateUserAction({
  user,
  isPending,
  error,
  onDeactivate,
}: {
  user: UserSummary;
  isPending: boolean;
  error?: unknown;
  onDeactivate: (user: UserSummary) => void;
}) {
  return (
    <div className='space-y-2'>
      <ConfirmDialog
        title={`Deactivate ${user.fullName}?`}
        description={`This will deactivate ${user.email} and revoke their active sessions. The backend will verify whether this account is eligible.`}
        confirmLabel='Deactivate account'
        variant='destructive'
        isPending={isPending}
        onConfirm={() => onDeactivate(user)}
        trigger={
          <Button type='button' variant='outline' size='sm' disabled={isPending}>
            <UserXIcon aria-hidden />
            {isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        }
      />
      {error !== undefined && (
        <p role='alert' className='max-w-72 text-sm text-destructive'>
          {deactivationErrorMessage(error)}
        </p>
      )}
    </div>
  );
}

function UserCards({
  users,
  canDeactivate,
  pendingUserId,
  failedUserId,
  mutationError,
  onDeactivate,
}: UserCollectionProps) {
  return (
    <div className='space-y-3 md:hidden' aria-label='Users'>
      {users.map((user) => (
        <article key={user.userId} className='space-y-4 rounded-surface border bg-surface p-4 shadow-xs'>
          <div className='min-w-0'>
            <h2 className='truncate font-semibold'>{user.fullName}</h2>
            <p className='mt-1 truncate text-sm text-muted-foreground'>{user.email}</p>
          </div>
          <PlatformRoleBadge role={user.platformRole} />
          <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm'>
            <dt className='text-muted-foreground'>User ID</dt>
            <dd className='truncate text-right'>{user.userId}</dd>
            <dt className='text-muted-foreground'>Created</dt>
            <dd className='text-right'>
              <time dateTime={user.createdAt}>{formatDateTime(user.createdAt)}</time>
            </dd>
            <dt className='text-muted-foreground'>Updated</dt>
            <dd className='text-right'>
              <time dateTime={user.updatedAt}>{formatDateTime(user.updatedAt)}</time>
            </dd>
          </dl>
          {canDeactivate && (
            <DeactivateUserAction
              user={user}
              isPending={pendingUserId === user.userId}
              error={failedUserId === user.userId ? mutationError : undefined}
              onDeactivate={onDeactivate}
            />
          )}
        </article>
      ))}
    </div>
  );
}

function UsersTable({
  users,
  canDeactivate,
  pendingUserId,
  failedUserId,
  mutationError,
  onDeactivate,
}: UserCollectionProps) {
  return (
    <div className='hidden overflow-hidden rounded-surface border bg-table shadow-xs md:block'>
      <Table aria-label='Users'>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
            {canDeactivate && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.userId}>
              <TableCell>
                <span className='block max-w-72 truncate font-semibold'>{user.fullName}</span>
                <span className='block max-w-72 truncate text-sm text-muted-foreground'>{user.email}</span>
                <span className='block max-w-72 truncate text-xs text-muted-foreground'>{user.userId}</span>
              </TableCell>
              <TableCell>
                <PlatformRoleBadge role={user.platformRole} />
              </TableCell>
              <TableCell>
                <time dateTime={user.createdAt}>{formatDateTime(user.createdAt)}</time>
              </TableCell>
              <TableCell>
                <time dateTime={user.updatedAt}>{formatDateTime(user.updatedAt)}</time>
              </TableCell>
              {canDeactivate && (
                <TableCell>
                  <DeactivateUserAction
                    user={user}
                    isPending={pendingUserId === user.userId}
                    error={failedUserId === user.userId ? mutationError : undefined}
                    onDeactivate={onDeactivate}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UsersLoading() {
  return (
    <div role='status' aria-label='Loading users' className='space-y-3'>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className='h-32 w-full md:h-20' />
      ))}
    </div>
  );
}

function UserManagementPage({ filters, onFiltersChange }: UserManagementPageProps) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [mutationUserId, setMutationUserId] = useState<string>();
  const usersQuery = useQuery(usersQueryOptions(filters));
  const deactivateMutation = useDeactivateUserMutation();
  const { can } = usePermissions();
  const canDeactivate = can(PERMISSION.USER_DEACTIVATE);
  const hasFilters = Boolean(filters.search || filters.platformRole);

  const updateFilters = (next: Partial<NormalizedUserListParams>) =>
    onFiltersChange({ ...filters, ...next, page: next.page ?? 1 });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters({ search: search.trim() || undefined });
  };

  const clearFilters = () => {
    setSearch('');
    onFiltersChange({
      page: 1,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  const deactivate = async (user: UserSummary) => {
    setMutationUserId(user.userId);
    try {
      await deactivateMutation.mutateAsync(user.userId);
      setMutationUserId(undefined);
      toast.success(`${user.fullName} was deactivated.`);
    } catch {
      // The normalized backend error is rendered beside the affected user.
    }
  };

  const errorDescription = isApplicationError(usersQuery.error)
    ? usersQuery.error.message
    : 'We could not load platform users. Please try again.';
  const users = usersQuery.data?.users ?? [];
  const meta = usersQuery.data?.meta;
  const totalItems = meta?.totalItems ?? 0;
  const totalPages = meta?.totalPages ?? 0;

  const collectionProps: UserCollectionProps = {
    users,
    canDeactivate,
    pendingUserId: deactivateMutation.isPending ? mutationUserId : undefined,
    failedUserId: deactivateMutation.isError ? mutationUserId : undefined,
    mutationError: deactivateMutation.error,
    onDeactivate: (user) => void deactivate(user),
  };

  return (
    <>
      <PageHeader title='Users' description='Browse active accounts across the Tooang platform.' />

      <form
        onSubmit={submitSearch}
        className='grid gap-3 rounded-surface border bg-surface p-4 shadow-xs lg:grid-cols-[minmax(14rem,1fr)_12rem_12rem_10rem_auto]'
        aria-label='Filter users'
      >
        <div className='space-y-1.5'>
          <label htmlFor='users-search' className='text-sm font-medium'>
            Search
          </label>
          <Input
            id='users-search'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={100}
            placeholder='Full name or email'
          />
        </div>
        <div className='space-y-1.5'>
          <label htmlFor='users-role' className='text-sm font-medium'>
            Platform role
          </label>
          <Select
            value={filters.platformRole ?? 'ALL'}
            onValueChange={(value) =>
              updateFilters({ platformRole: value === 'ALL' ? undefined : (value as PlatformRole) })
            }
          >
            <SelectTrigger id='users-role' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All roles</SelectItem>
              {Object.values(PlatformRole).map((role) => (
                <SelectItem key={role} value={role}>
                  {rolePresentation[role].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <label htmlFor='users-sort-by' className='text-sm font-medium'>
            Sort by
          </label>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value as UserSortBy })}>
            <SelectTrigger id='users-sort-by' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(USER_SORT_BY).map((sortBy) => (
                <SelectItem key={sortBy} value={sortBy}>
                  {sortLabels[sortBy]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <label htmlFor='users-sort-order' className='text-sm font-medium'>
            Direction
          </label>
          <Select
            value={filters.sortOrder}
            onValueChange={(value) => updateFilters({ sortOrder: value as UserSortOrder })}
          >
            <SelectTrigger id='users-sort-order' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={USER_SORT_ORDER.ASC}>Ascending</SelectItem>
              <SelectItem value={USER_SORT_ORDER.DESC}>Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='flex items-end gap-2'>
          <Button type='submit' className='flex-1 lg:flex-none'>
            <SearchIcon aria-hidden />
            Search
          </Button>
          {hasFilters && (
            <Button type='button' variant='outline' onClick={clearFilters} aria-label='Clear user filters'>
              <XIcon aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </form>

      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <ArrowUpDownIcon className='size-4' aria-hidden />
        Sorted by {sortLabels[filters.sortBy].toLowerCase()}, {filters.sortOrder === 'asc' ? 'ascending' : 'descending'}
        .
      </div>

      {usersQuery.isPending ? (
        <UsersLoading />
      ) : usersQuery.isError && !usersQuery.data ? (
        <ErrorState
          title='Could not load users'
          description={errorDescription}
          onRetry={() => void usersQuery.refetch()}
          isRetrying={usersQuery.isFetching}
        />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={hasFilters ? 'No users match these filters' : 'No active users'}
          description={
            hasFilters
              ? 'Try changing or clearing the search and role filter.'
              : 'Active platform accounts will appear here.'
          }
          action={
            hasFilters ? (
              <Button type='button' variant='outline' onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className='space-y-4'>
          <UserCards {...collectionProps} />
          <UsersTable {...collectionProps} />
          <Pagination
            page={filters.page}
            pageSize={filters.limit}
            totalItems={totalItems}
            totalPages={totalPages}
            disabled={usersQuery.isFetching || deactivateMutation.isPending}
            onPageChange={(page) => updateFilters({ page })}
            onPageSizeChange={(limit) => onFiltersChange({ ...filters, page: 1, limit })}
          />
        </div>
      )}

      <p className='sr-only' aria-live='polite'>
        {usersQuery.isFetching && !usersQuery.isPending ? 'Updating users.' : ''}
      </p>
    </>
  );
}

export {
  deactivationErrorMessage,
  PlatformRoleBadge,
  UserCards,
  UserManagementPage,
  type UserManagementPageProps,
  UsersTable,
};
