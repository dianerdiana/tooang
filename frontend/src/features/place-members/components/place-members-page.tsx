import { useMemo, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2Icon, LockIcon, PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { StatusBadge } from '@/components/ui/status-badge';

import { isApplicationError } from '@/utils/api-error.util';
import { canAtPlace } from '@/utils/auth/has-permission';
import { useAppAbility } from '@/utils/hooks/use-app-ability';

import { PERMISSION } from '@/types/permission.type';

import {
  useRevokeCashierMutation,
  useSetCashierMutation,
  useSetMemberRoleMutation,
  useSetOwnerMutation,
} from '../queries/place-members.mutation';
import { placeMembersQueryOptions } from '../queries/place-members.query';
import {
  cashierFormValues,
  publicUserIdSchema,
  toCashierAssignment,
  toOwnerAssignment,
} from '../schemas/place-members.schema';
import type { PlaceMember, PlaceMemberRole } from '../types/place-members.type';

export type PlaceMemberPermissions = {
  canRead: boolean;
  canAssignCashier: boolean;
  canRevokeCashier: boolean;
  canAssignOwner: boolean;
  canRevokeOwner: boolean;
};

const operationError = (error: unknown, operation: string) => {
  if (!isApplicationError(error)) return `Unable to ${operation}. Please try again.`;
  if (error.httpStatus === 403) return `You no longer have permission to ${operation}.`;
  if (error.httpStatus === 404) return 'The user or membership is unavailable or outside your access.';
  if (error.httpStatus === 409) return error.message;
  if (error.isNetworkError) return `Could not reach the server to ${operation}. Please try again.`;
  return error.message;
};

const firstMessage = (errors: unknown[]) => {
  const error = errors[0];
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    return error.message;
  return undefined;
};

const formatJoinedDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

function AssignMemberDrawer({
  placeId,
  role,
  open,
  onOpenChange,
}: {
  placeId: string;
  role: 'OWNER' | 'CASHIER';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cashierMutation = useSetCashierMutation(placeId);
  const ownerMutation = useSetOwnerMutation(placeId);
  const mutation = role === 'OWNER' ? ownerMutation : cashierMutation;
  const [ownerAssignment, setOwnerAssignment] = useState<ReturnType<typeof toOwnerAssignment>>();
  const submitAssignment = async (
    assignment: ReturnType<typeof toCashierAssignment> | ReturnType<typeof toOwnerAssignment>,
  ) => {
    try {
      const member = await mutation.mutateAsync(assignment as never);
      toast.success(`${member.user.fullName} is now ${role === 'OWNER' ? 'an owner' : 'a cashier'}.`);
      setOwnerAssignment(undefined);
      form.reset();
      onOpenChange(false);
    } catch {
      // Normalized API errors are rendered below.
    }
  };
  const form = useForm({
    defaultValues: cashierFormValues(),
    onSubmit: async ({ value }) => {
      const assignment = role === 'OWNER' ? toOwnerAssignment(value) : toCashierAssignment(value);
      if (role === 'OWNER') setOwnerAssignment(assignment as ReturnType<typeof toOwnerAssignment>);
      else await submitAssignment(assignment);
    },
  });
  const changeOpen = (next: boolean) => {
    if (!next) {
      mutation.reset();
      setOwnerAssignment(undefined);
      form.reset();
    }
    onOpenChange(next);
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={changeOpen}
      side='right'
      title={role === 'OWNER' ? 'Assign owner' : 'Assign cashier'}
      description={`Enter the public user ID. This assigns, reactivates, or changes the membership to ${role}.`}
    >
      <form
        className='space-y-5'
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field name='userId' validators={{ onBlur: publicUserIdSchema }}>
          {(field) => (
            <FormField error={field.state.meta.isTouched ? firstMessage(field.state.meta.errors) : undefined}>
              <FormLabel>Public user ID</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  value={field.state.value}
                  maxLength={100}
                  disabled={mutation.isPending}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    mutation.reset();
                    field.handleChange(event.target.value);
                  }}
                  placeholder='User identifier'
                />
              </FormControl>
              <FormMessage />
            </FormField>
          )}
        </form.Field>
        <div className='rounded-md border bg-muted/30 p-3 text-sm'>
          <span className='font-medium'>Membership role:</span> {role}
        </div>
        {mutation.isError && (
          <p role='alert' className='text-sm text-destructive'>
            {operationError(mutation.error, `assign this ${role.toLowerCase()}`)}
          </p>
        )}
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={() => changeOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => (
              <Button
                type='submit'
                disabled={!publicUserIdSchema.safeParse(values.userId).success || isSubmitting || mutation.isPending}
              >
                {isSubmitting || mutation.isPending ? (
                  <Loader2Icon className='animate-spin' aria-hidden />
                ) : (
                  <PlusIcon aria-hidden />
                )}
                {isSubmitting || mutation.isPending ? 'Assigning…' : `Assign ${role.toLowerCase()}`}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
      {role === 'OWNER' && (
        <ConfirmDialog
          open={ownerAssignment !== undefined}
          onOpenChange={(next) => !next && !mutation.isPending && setOwnerAssignment(undefined)}
          title='Assign OWNER membership?'
          description={`This grants OWNER access to ${ownerAssignment?.userId ?? 'this user'}. The backend will verify authorization and invariants.`}
          confirmLabel='Assign owner'
          isPending={mutation.isPending}
          onConfirm={() => ownerAssignment && void submitAssignment(ownerAssignment)}
        />
      )}
    </ResponsiveDrawer>
  );
}

export function MembersTable({
  members,
  permissions,
  onRevoke,
  onChangeRole,
  revokingUserId,
}: {
  members: PlaceMember[];
  permissions: PlaceMemberPermissions;
  onRevoke: (member: PlaceMember) => void;
  onChangeRole: (member: PlaceMember, role: PlaceMemberRole) => void;
  revokingUserId?: string;
}) {
  const columns = useMemo<ColumnDef<PlaceMember>[]>(
    () => [
      {
        id: 'identity',
        header: 'Member',
        cell: ({ row }) => (
          <div>
            <p className='font-medium'>{row.original.user.fullName}</p>
            <p className='text-sm text-muted-foreground'>{row.original.user.email}</p>
          </div>
        ),
      },
      {
        id: 'userId',
        header: 'Public user ID',
        cell: ({ row }) => <span className='font-mono text-xs'>{row.original.user.userId}</span>,
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <StatusBadge tone={row.original.role === 'OWNER' ? 'primary' : 'neutral'} showDot>
            {row.original.role === 'OWNER' ? 'Owner' : 'Cashier'}
          </StatusBadge>
        ),
      },
      { accessorKey: 'createdAt', header: 'Joined', cell: ({ row }) => formatJoinedDate(row.original.createdAt) },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Actions</span>,
        cell: ({ row }) => {
          const member = row.original;
          const canPromote = member.role === 'CASHIER' && permissions.canAssignOwner;
          const canDemote = member.role === 'OWNER' && permissions.canRevokeOwner && permissions.canAssignCashier;
          const canRevoke =
            (member.role === 'OWNER' && permissions.canRevokeOwner) ||
            (member.role === 'CASHIER' && permissions.canRevokeCashier);
          if (!canPromote && !canDemote && !canRevoke) return null;
          return (
            <div className='flex justify-end gap-1'>
              {canPromote && (
                <ConfirmDialog
                  title={`Promote ${member.user.fullName} to OWNER?`}
                  description='This changes the membership from CASHIER to OWNER and grants owner-level place access.'
                  confirmLabel='Promote to owner'
                  isPending={revokingUserId === member.user.userId}
                  onConfirm={() => onChangeRole(member, 'OWNER')}
                  trigger={
                    <Button type='button' variant='outline' size='sm'>
                      Promote to owner
                    </Button>
                  }
                />
              )}
              {canDemote && (
                <ConfirmDialog
                  title={`Change ${member.user.fullName} to CASHIER?`}
                  description='This removes OWNER access and retains CASHIER access. The backend will enforce the last-OWNER invariant.'
                  confirmLabel='Change to cashier'
                  variant='destructive'
                  isPending={revokingUserId === member.user.userId}
                  onConfirm={() => onChangeRole(member, 'CASHIER')}
                  trigger={
                    <Button type='button' variant='outline' size='sm'>
                      Change to cashier
                    </Button>
                  }
                />
              )}
              {canRevoke && (
                <ConfirmDialog
                  title={`Revoke ${member.user.fullName}'s ${member.role} membership?`}
                  description={`This user will immediately lose ${member.role} access to this place. The backend will enforce membership invariants.`}
                  confirmLabel={`Revoke ${member.role.toLowerCase()}`}
                  variant='destructive'
                  isPending={revokingUserId === member.user.userId}
                  onConfirm={() => onRevoke(member)}
                  trigger={
                    <Button type='button' variant='ghost' size='sm' disabled={Boolean(revokingUserId)}>
                      <Trash2Icon aria-hidden /> Revoke
                    </Button>
                  }
                />
              )}
            </div>
          );
        },
      },
    ],
    [onChangeRole, onRevoke, permissions, revokingUserId],
  );
  return (
    <DataTable
      columns={columns}
      data={members}
      getRowId={(member) => member.membershipId}
      ariaLabel='Place members'
      emptyTitle='No active members'
      emptyDescription='The backend returned no active memberships for this view.'
    />
  );
}

export function MembersPanel({ placeId, permissions }: { placeId: string; permissions: PlaceMemberPermissions }) {
  const query = useQuery({ ...placeMembersQueryOptions(placeId), enabled: permissions.canRead });
  const revokeMutation = useRevokeCashierMutation(placeId);
  const changeRoleMutation = useSetMemberRoleMutation(placeId);
  const [assigningRole, setAssigningRole] = useState<PlaceMemberRole>();
  const [revokingUserId, setRevokingUserId] = useState<string>();
  const [revokeError, setRevokeError] = useState<string>();
  const revoke = async (member: PlaceMember) => {
    setRevokeError(undefined);
    setRevokingUserId(member.user.userId);
    try {
      await revokeMutation.mutateAsync(member.user.userId);
      toast.success(`${member.user.fullName}'s ${member.role.toLowerCase()} membership was revoked.`);
    } catch (error) {
      setRevokeError(operationError(error, `revoke this ${member.role.toLowerCase()}`));
    } finally {
      setRevokingUserId(undefined);
    }
  };
  const changeRole = async (member: PlaceMember, role: PlaceMemberRole) => {
    setRevokeError(undefined);
    setRevokingUserId(member.user.userId);
    try {
      await changeRoleMutation.mutateAsync({ userId: member.user.userId, input: { role } });
      toast.success(`${member.user.fullName} is now ${role === 'OWNER' ? 'an owner' : 'a cashier'}.`);
    } catch (error) {
      setRevokeError(operationError(error, `change this membership to ${role}`));
    } finally {
      setRevokingUserId(undefined);
    }
  };

  return (
    <SectionCard
      title='Place members'
      description='Active memberships returned by the backend. This collection is currently unpaginated.'
      action={
        permissions.canAssignCashier || permissions.canAssignOwner ? (
          <div className='flex gap-2'>
            {permissions.canAssignCashier && (
              <Button type='button' variant='outline' onClick={() => setAssigningRole('CASHIER')}>
                <PlusIcon aria-hidden /> Assign cashier
              </Button>
            )}
            {permissions.canAssignOwner && (
              <Button type='button' onClick={() => setAssigningRole('OWNER')}>
                <PlusIcon aria-hidden /> Assign owner
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {!permissions.canAssignCashier &&
        !permissions.canRevokeCashier &&
        !permissions.canAssignOwner &&
        !permissions.canRevokeOwner && (
          <p className='mb-4 flex items-center gap-2 text-sm text-muted-foreground'>
            <LockIcon className='size-4' aria-hidden /> You have read-only access to membership data.
          </p>
        )}
      {revokeError && (
        <p role='alert' className='mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          {revokeError}
        </p>
      )}
      {query.isPending ? (
        <DataTable columns={[]} data={[]} isLoading ariaLabel='Loading place members' />
      ) : query.isError ? (
        <DataTable
          columns={[]}
          data={[]}
          error={operationError(query.error, 'load place members')}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <MembersTable
          members={query.data ?? []}
          permissions={permissions}
          onRevoke={(member) => void revoke(member)}
          onChangeRole={(member, role) => void changeRole(member, role)}
          revokingUserId={revokingUserId}
        />
      )}
      {assigningRole && (
        <AssignMemberDrawer
          placeId={placeId}
          role={assigningRole}
          open
          onOpenChange={(open) => !open && setAssigningRole(undefined)}
        />
      )}
    </SectionCard>
  );
}

export function MembersPage({ placeId, placeName }: { placeId: string; placeName: string }) {
  const ability = useAppAbility();
  const permissions = {
    canRead: canAtPlace(ability, placeId, PERMISSION.PLACE_MEMBER_READ),
    canAssignCashier: canAtPlace(ability, placeId, PERMISSION.CASHIER_ASSIGN),
    canRevokeCashier: canAtPlace(ability, placeId, PERMISSION.CASHIER_REVOKE),
    canAssignOwner: canAtPlace(ability, placeId, PERMISSION.OWNER_ASSIGN),
    canRevokeOwner: canAtPlace(ability, placeId, PERMISSION.OWNER_REVOKE),
  };
  return (
    <>
      <PageHeader
        title='Members'
        description={`Manage active memberships for ${placeName}.`}
        leading={
          <span className='flex size-11 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <UsersIcon aria-hidden />
          </span>
        }
      />
      <MembersPanel placeId={placeId} permissions={permissions} />
    </>
  );
}
