import { useMemo, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon, Loader2Icon, LockIcon, PlusIcon, Table2Icon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';

import { managementPlaceQueryOptions } from '@/features/places/queries/places.query';

import { isApplicationError } from '@/utils/api-error.util';
import { canAtPlace } from '@/utils/auth/has-permission';
import { useAppAbility } from '@/utils/hooks/use-app-ability';

import { PERMISSION } from '@/types/permission.type';

import {
  useCreateDiningTableMutation,
  useDeleteDiningTableMutation,
  useUpdateDiningTableMutation,
} from '../queries/dining-tables.mutation';
import { diningTableQueryOptions, diningTablesQueryOptions } from '../queries/dining-tables.query';
import {
  changedDiningTableFields,
  createDiningTableSchema,
  diningTableNameSchema,
  diningTableToFormValues,
  toCreateDiningTableInput,
} from '../schemas/dining-tables.schema';
import type { DiningTable } from '../types/dining-tables.type';

type DiningTablePermissions = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const firstIssue = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'issues' in error) {
    return (error as { issues?: { message?: string }[] }).issues?.[0]?.message ?? fallback;
  }
  return fallback;
};

const mutationErrorMessage = (error: unknown, action: string) => {
  if (!isApplicationError(error)) return `Unable to ${action}. Please try again.`;
  if (error.httpStatus === 409) return error.message;
  if (error.httpStatus === 403) return `You no longer have permission to ${action}.`;
  if (error.httpStatus === 404) return 'This dining table is unavailable or outside your access.';
  if (error.isNetworkError) return `Could not reach the server to ${action}. Please try again.`;
  return error.message;
};

function DiningTablesTable({ tables, onOpen }: { tables: DiningTable[]; onOpen: (tableId: string) => void }) {
  const columns = useMemo<ColumnDef<DiningTable>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Table name',
        cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
      },
      {
        accessorKey: 'tableId',
        header: 'Identifier',
        cell: ({ row }) => <span className='font-mono text-xs text-muted-foreground'>{row.original.tableId}</span>,
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge tone={row.original.isActive ? 'success' : 'neutral'} showDot>
            {row.original.isActive ? 'Active' : 'Inactive'}
          </StatusBadge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Actions</span>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Button type='button' variant='ghost' size='sm' onClick={() => onOpen(row.original.tableId)}>
              <EyeIcon aria-hidden /> View
            </Button>
          </div>
        ),
      },
    ],
    [onOpen],
  );

  return (
    <DataTable
      columns={columns}
      data={tables}
      getRowId={(table) => table.tableId}
      ariaLabel='Dining tables'
      emptyTitle='No dining tables'
      emptyDescription='No tables have been configured for this place.'
    />
  );
}

function CreateDiningTableDrawer({
  placeId,
  open,
  onOpenChange,
}: {
  placeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateDiningTableMutation(placeId);
  const [fieldError, setFieldError] = useState<string>();
  const form = useForm({
    defaultValues: diningTableToFormValues(),
    validators: { onSubmit: createDiningTableSchema },
    onSubmit: async ({ value }) => {
      setFieldError(undefined);
      try {
        const table = await mutation.mutateAsync(toCreateDiningTableInput(value));
        toast.success(`${table.name} created.`);
        onOpenChange(false);
        form.reset();
      } catch (error) {
        if (!isApplicationError(error) || error.httpStatus !== 409) return;
        setFieldError(error.message);
      }
    },
  });
  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFieldError(undefined);
      mutation.reset();
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={changeOpen}
      side='right'
      title='Create dining table'
      description='Add a table identifier customers and staff can recognize.'
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
        <form.Field name='name' validators={{ onBlur: diningTableNameSchema }}>
          {(field) => {
            const localError = field.state.meta.isTouched
              ? firstIssue(field.state.meta.errors[0], 'Enter a valid table name')
              : undefined;
            return (
              <FormField error={fieldError ?? localError}>
                <FormLabel>Table name</FormLabel>
                <FormControl>
                  <Input
                    autoFocus
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      setFieldError(undefined);
                      field.handleChange(event.target.value);
                    }}
                    placeholder='e.g. Patio 1'
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            );
          }}
        </form.Field>
        {mutation.isError && !fieldError && (
          <p role='alert' className='text-sm text-destructive'>
            {mutationErrorMessage(mutation.error, 'create this dining table')}
          </p>
        )}
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={() => changeOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.values] as const}>
            {([canSubmit, isSubmitting, values]) => (
              <Button
                type='submit'
                disabled={
                  !canSubmit || !createDiningTableSchema.safeParse(values).success || isSubmitting || mutation.isPending
                }
              >
                {isSubmitting || mutation.isPending ? (
                  <Loader2Icon className='animate-spin' aria-hidden />
                ) : (
                  <PlusIcon aria-hidden />
                )}
                {isSubmitting || mutation.isPending ? 'Creating…' : 'Create table'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </ResponsiveDrawer>
  );
}

function DiningTableDetail({
  placeId,
  table,
  permissions,
  onDeleted,
}: {
  placeId: string;
  table: DiningTable;
  permissions: DiningTablePermissions;
  onDeleted: () => void;
}) {
  const updateMutation = useUpdateDiningTableMutation(placeId, table.tableId);
  const deleteMutation = useDeleteDiningTableMutation(placeId, table.tableId);
  const [isActive, setIsActive] = useState(table.isActive);
  const [fieldError, setFieldError] = useState<string>();
  const [deleteError, setDeleteError] = useState<string>();
  const form = useForm({
    defaultValues: diningTableToFormValues(table),
    onSubmit: async ({ value }) => {
      setFieldError(undefined);
      try {
        const input = changedDiningTableFields(value, table, isActive);
        const updated = await updateMutation.mutateAsync(input);
        toast.success(`${updated.name} updated.`);
      } catch (error) {
        if (isApplicationError(error) && error.httpStatus === 409) setFieldError(error.message);
        else if (!isApplicationError(error)) setFieldError(firstIssue(error, 'Change at least one field'));
      }
    },
  });

  const remove = async () => {
    setDeleteError(undefined);
    try {
      await deleteMutation.mutateAsync();
      toast.success(`${table.name} deleted.`);
      onDeleted();
    } catch (error) {
      setDeleteError(mutationErrorMessage(error, 'delete this dining table'));
    }
  };

  if (!permissions.canUpdate && !permissions.canDelete) {
    return (
      <dl className='space-y-5'>
        <div>
          <dt className='text-xs font-medium uppercase text-muted-foreground'>Name</dt>
          <dd className='mt-1 font-medium'>{table.name}</dd>
        </div>
        <div>
          <dt className='text-xs font-medium uppercase text-muted-foreground'>Identifier</dt>
          <dd className='mt-1 break-all font-mono text-xs'>{table.tableId}</dd>
        </div>
        <div>
          <dt className='text-xs font-medium uppercase text-muted-foreground'>Status</dt>
          <dd className='mt-1'>
            <StatusBadge tone={table.isActive ? 'success' : 'neutral'} showDot>
              {table.isActive ? 'Active' : 'Inactive'}
            </StatusBadge>
          </dd>
        </div>
        <p className='flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground'>
          <LockIcon className='size-4' aria-hidden /> Read-only access
        </p>
      </dl>
    );
  }

  return (
    <form
      className='space-y-5'
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name='name' validators={{ onBlur: diningTableNameSchema }}>
        {(field) => (
          <FormField error={fieldError}>
            <FormLabel>Table name</FormLabel>
            <FormControl>
              <Input
                value={field.state.value}
                disabled={!permissions.canUpdate || updateMutation.isPending}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  setFieldError(undefined);
                  field.handleChange(event.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormField>
        )}
      </form.Field>

      <div className='space-y-2'>
        <p className='text-sm font-medium'>Status</p>
        <Button
          type='button'
          variant={isActive ? 'secondary' : 'outline'}
          role='switch'
          aria-checked={isActive}
          disabled={!permissions.canUpdate || updateMutation.isPending}
          onClick={() => setIsActive((value) => !value)}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Button>
        <p className='text-xs text-muted-foreground'>Inactive tables are unavailable for new table assignments.</p>
      </div>

      {updateMutation.isError && !fieldError && (
        <p role='alert' className='text-sm text-destructive'>
          {mutationErrorMessage(updateMutation.error, 'update this dining table')}
        </p>
      )}
      {deleteError && (
        <p role='alert' className='text-sm text-destructive'>
          {deleteError}
        </p>
      )}

      <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-5'>
        {permissions.canDelete ? (
          <ConfirmDialog
            title={`Delete “${table.name}”?`}
            description='This table will be permanently unavailable. Its name remains reserved for historical records.'
            confirmLabel='Delete table'
            variant='destructive'
            isPending={deleteMutation.isPending}
            onConfirm={() => void remove()}
            trigger={
              <Button type='button' variant='destructive' disabled={updateMutation.isPending}>
                <Trash2Icon aria-hidden /> Delete
              </Button>
            }
          />
        ) : (
          <span />
        )}
        {permissions.canUpdate && (
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => {
              const hasChanges = values.name.trim().replace(/\s+/gu, ' ') !== table.name || isActive !== table.isActive;
              return (
                <Button
                  type='submit'
                  disabled={!hasChanges || isSubmitting || updateMutation.isPending || deleteMutation.isPending}
                >
                  {isSubmitting || updateMutation.isPending ? (
                    <Loader2Icon className='animate-spin' aria-hidden />
                  ) : null}
                  {isSubmitting || updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              );
            }}
          </form.Subscribe>
        )}
      </div>
    </form>
  );
}

function DiningTableDetailDrawer({
  placeId,
  tableId,
  permissions,
  onClose,
}: {
  placeId: string;
  tableId: string | null;
  permissions: DiningTablePermissions;
  onClose: () => void;
}) {
  return (
    <ResponsiveDrawer
      open={tableId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      side='right'
      title='Dining table details'
      description='Review the backend record and available management actions.'
    >
      {tableId && (
        <DiningTableDetailContent placeId={placeId} tableId={tableId} permissions={permissions} onClose={onClose} />
      )}
    </ResponsiveDrawer>
  );
}

function DiningTableDetailContent({
  placeId,
  tableId,
  permissions,
  onClose,
}: {
  placeId: string;
  tableId: string;
  permissions: DiningTablePermissions;
  onClose: () => void;
}) {
  const query = useQuery(diningTableQueryOptions(placeId, tableId));
  if (query.isPending) return <Skeleton className='h-64 w-full' role='status' aria-label='Loading dining table' />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        compact
        title='Could not load dining table'
        description={mutationErrorMessage(query.error, 'load this dining table')}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }
  return (
    <DiningTableDetail
      key={query.data.updatedAt}
      placeId={placeId}
      table={query.data}
      permissions={permissions}
      onDeleted={onClose}
    />
  );
}

function DiningTablesPanel({ placeId, permissions }: { placeId: string; permissions: DiningTablePermissions }) {
  const query = useQuery(diningTablesQueryOptions(placeId));
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const openTable = (tableId: string) => setSelectedTableId(tableId);

  return (
    <SectionCard
      title='Dining tables'
      description='The backend returns the complete table collection; no client-side pagination is applied.'
      action={
        permissions.canCreate ? (
          <Button type='button' onClick={() => setIsCreating(true)}>
            <PlusIcon aria-hidden /> Add table
          </Button>
        ) : undefined
      }
    >
      {!permissions.canCreate && !permissions.canUpdate && !permissions.canDelete && (
        <p className='mb-4 flex items-center gap-2 text-sm text-muted-foreground'>
          <LockIcon className='size-4' aria-hidden /> You have read-only access to dining tables.
        </p>
      )}
      {query.isPending ? (
        <div role='status' aria-label='Loading dining tables' className='space-y-3'>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className='h-12 w-full' />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          compact
          title='Could not load dining tables'
          description='The dining-table list could not be retrieved.'
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <DiningTablesTable tables={query.data} onOpen={openTable} />
      )}
      {permissions.canCreate && (
        <CreateDiningTableDrawer placeId={placeId} open={isCreating} onOpenChange={setIsCreating} />
      )}
      <DiningTableDetailDrawer
        placeId={placeId}
        tableId={selectedTableId}
        permissions={permissions}
        onClose={() => setSelectedTableId(null)}
      />
    </SectionCard>
  );
}

function DiningTablesPage({ placeId }: { placeId: string }) {
  const ability = useAppAbility();
  const placeQuery = useQuery(managementPlaceQueryOptions(placeId));
  if (placeQuery.isPending) return <Skeleton className='h-96 w-full' role='status' aria-label='Loading place' />;
  if (placeQuery.isError || !placeQuery.data)
    return <ErrorState title='Could not load place' onRetry={() => void placeQuery.refetch()} />;
  const permissions = {
    canCreate: canAtPlace(ability, placeId, PERMISSION.TABLE_CREATE),
    canUpdate: canAtPlace(ability, placeId, PERMISSION.TABLE_UPDATE),
    canDelete: canAtPlace(ability, placeId, PERMISSION.TABLE_DELETE),
  };
  return (
    <>
      <PageHeader
        title='Dining tables'
        description={`Manage table identifiers for ${placeQuery.data.name}.`}
        leading={
          <span className='flex size-11 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <Table2Icon aria-hidden />
          </span>
        }
      />
      <DiningTablesPanel placeId={placeId} permissions={permissions} />
    </>
  );
}

export { DiningTableDetail, type DiningTablePermissions, DiningTablesPage, DiningTablesPanel, DiningTablesTable };
