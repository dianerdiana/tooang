import { useMemo, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon, Layers3Icon, Loader2Icon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/error-state';
import { FilterBar, FilterSelect } from '@/components/ui/filter-controls';
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
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from '../queries/menu-categories.mutation';
import { menuCategoriesQueryOptions, menuCategoryQueryOptions } from '../queries/menu-categories.query';
import {
  changedMenuCategoryFields,
  menuCategoryNameSchema,
  menuCategorySortOrderSchema,
  menuCategoryToFormValues,
  normalizeMenuCategoryName,
  toCreateMenuCategoryInput,
} from '../schemas/menu-categories.schema';
import type {
  MenuCategory,
  MenuCategoryFormValues,
  NormalizedMenuCategoryListParams,
} from '../types/menu-categories.type';

type MenuCategoryPermissions = { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const useMenuCategoryForm = (
  defaultValues: MenuCategoryFormValues,
  onSubmit: (values: MenuCategoryFormValues) => Promise<void>,
) =>
  useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value),
  });

type MenuCategoryFormApi = ReturnType<typeof useMenuCategoryForm>;

const issueMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'issues' in error) {
    return (error as { issues?: { message?: string }[] }).issues?.[0]?.message ?? fallback;
  }
  return fallback;
};

const fieldMessage = (errors: unknown[], touched: boolean) => {
  if (!touched) return undefined;
  const error = errors[0];
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};

const operationError = (error: unknown, operation: string) => {
  if (!isApplicationError(error)) return `Unable to ${operation}. Please try again.`;
  if (error.httpStatus === 403) return `You no longer have permission to ${operation}.`;
  if (error.httpStatus === 404) return 'This menu category is unavailable or outside your access.';
  if (error.httpStatus === 409) return error.message;
  if (error.isNetworkError) return `Could not reach the server to ${operation}. Please try again.`;
  return error.message;
};

function CategoryStatusControl({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type='button'
      variant={value ? 'secondary' : 'outline'}
      role='switch'
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
    >
      {value ? 'Active' : 'Inactive'}
    </Button>
  );
}

function CategoryFields({
  form,
  fieldError,
  disabled,
  onChange,
}: {
  form: MenuCategoryFormApi;
  fieldError?: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <div className='space-y-5'>
      <form.Field name='name' validators={{ onBlur: menuCategoryNameSchema }}>
        {(field) => (
          <FormField error={fieldError ?? fieldMessage(field.state.meta.errors, field.state.meta.isTouched)}>
            <FormLabel>Category name</FormLabel>
            <FormControl>
              <Input
                value={field.state.value}
                disabled={disabled}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  onChange();
                  field.handleChange(event.target.value);
                }}
                placeholder='e.g. Main courses'
              />
            </FormControl>
            <FormMessage />
          </FormField>
        )}
      </form.Field>
      <form.Field name='sortOrder' validators={{ onBlur: menuCategorySortOrderSchema }}>
        {(field) => (
          <FormField error={fieldMessage(field.state.meta.errors, field.state.meta.isTouched)}>
            <FormLabel>Sort order</FormLabel>
            <FormControl>
              <Input
                type='number'
                min={0}
                step={1}
                inputMode='numeric'
                value={field.state.value}
                disabled={disabled}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  onChange();
                  field.handleChange(event.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormField>
        )}
      </form.Field>
      <form.Field name='isActive'>
        {(field) => (
          <div className='space-y-2'>
            <p className='text-sm font-medium'>Status</p>
            <CategoryStatusControl
              value={field.state.value}
              disabled={disabled}
              onChange={(value) => {
                onChange();
                field.handleChange(value);
              }}
            />
            <p className='text-xs text-muted-foreground'>Inactive categories are hidden from the public menu.</p>
          </div>
        )}
      </form.Field>
    </div>
  );
}

function CreateCategoryDrawer({
  placeId,
  open,
  onOpenChange,
}: {
  placeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateMenuCategoryMutation(placeId);
  const [fieldError, setFieldError] = useState<string>();
  const form = useMenuCategoryForm(menuCategoryToFormValues(), async (value) => {
    setFieldError(undefined);
    try {
      const category = await mutation.mutateAsync(toCreateMenuCategoryInput(value));
      toast.success(`${category.name} created.`);
      onOpenChange(false);
    } catch (error) {
      if (isApplicationError(error) && error.httpStatus === 409) setFieldError(error.message);
      else if (!isApplicationError(error)) setFieldError(issueMessage(error, 'Check the category fields.'));
    }
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
      title='Create menu category'
      description='Add an ordered category to this place menu.'
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
        <CategoryFields form={form} fieldError={fieldError} onChange={() => setFieldError(undefined)} />
        {mutation.isError && !fieldError && (
          <p role='alert' className='text-sm text-destructive'>
            {operationError(mutation.error, 'create this category')}
          </p>
        )}
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={() => changeOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => {
              const valid = (() => {
                try {
                  toCreateMenuCategoryInput(values);
                  return true;
                } catch {
                  return false;
                }
              })();
              return (
                <Button type='submit' disabled={!valid || isSubmitting || mutation.isPending}>
                  {isSubmitting || mutation.isPending ? (
                    <Loader2Icon className='animate-spin' aria-hidden />
                  ) : (
                    <PlusIcon aria-hidden />
                  )}
                  {isSubmitting || mutation.isPending ? 'Creating…' : 'Create category'}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
      </form>
    </ResponsiveDrawer>
  );
}

function CategoryDetail({
  placeId,
  category,
  permissions,
  onDeleted,
}: {
  placeId: string;
  category: MenuCategory;
  permissions: MenuCategoryPermissions;
  onDeleted: () => void;
}) {
  const updateMutation = useUpdateMenuCategoryMutation(placeId, category.categoryId);
  const deleteMutation = useDeleteMenuCategoryMutation(placeId, category.categoryId);
  const [fieldError, setFieldError] = useState<string>();
  const [deleteError, setDeleteError] = useState<string>();
  const form = useMenuCategoryForm(menuCategoryToFormValues(category), async (value) => {
    setFieldError(undefined);
    try {
      const updated = await updateMutation.mutateAsync(changedMenuCategoryFields(value, category));
      toast.success(`${updated.name} updated.`);
    } catch (error) {
      if (isApplicationError(error) && error.httpStatus === 409) setFieldError(error.message);
      else if (!isApplicationError(error)) setFieldError(issueMessage(error, 'Change at least one field.'));
    }
  });
  const remove = async () => {
    setDeleteError(undefined);
    try {
      await deleteMutation.mutateAsync();
      toast.success(`${category.name} deleted.`);
      onDeleted();
    } catch (error) {
      setDeleteError(operationError(error, 'delete this category'));
    }
  };

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
      <CategoryFields
        form={form}
        fieldError={fieldError}
        disabled={!permissions.canUpdate || updateMutation.isPending}
        onChange={() => setFieldError(undefined)}
      />
      <div className='space-y-1 border-t pt-4 text-xs text-muted-foreground'>
        <p>Category ID</p>
        <p className='break-all font-mono'>{category.categoryId}</p>
      </div>
      {updateMutation.isError && !fieldError && (
        <p role='alert' className='text-sm text-destructive'>
          {operationError(updateMutation.error, 'update this category')}
        </p>
      )}
      {deleteError && (
        <p role='alert' className='text-sm text-destructive'>
          {deleteError}
        </p>
      )}
      <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-5'>
        {permissions.canDelete ? (
          <div className='space-y-1.5'>
            <ConfirmDialog
              title={`Delete “${category.name}”?`}
              description='This soft-delete is blocked while the category still contains menu items. The category name remains reserved.'
              confirmLabel='Delete category'
              variant='destructive'
              isPending={deleteMutation.isPending}
              onConfirm={() => void remove()}
              trigger={
                <Button type='button' variant='destructive' disabled={updateMutation.isPending}>
                  <Trash2Icon aria-hidden /> Delete
                </Button>
              }
            />
            <p className='text-xs text-muted-foreground'>Only categories without menu items can be soft-deleted.</p>
          </div>
        ) : (
          <span />
        )}
        {permissions.canUpdate && (
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => {
              const hasChanges =
                normalizeMenuCategoryName(values.name) !== category.name ||
                Number(values.sortOrder) !== category.sortOrder ||
                values.isActive !== category.isActive;
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

function CategoryDetailContent({
  placeId,
  categoryId,
  permissions,
  onClose,
}: {
  placeId: string;
  categoryId: string;
  permissions: MenuCategoryPermissions;
  onClose: () => void;
}) {
  const query = useQuery(menuCategoryQueryOptions(placeId, categoryId));
  if (query.isPending) return <Skeleton className='h-72 w-full' role='status' aria-label='Loading menu category' />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        compact
        title='Could not load category'
        description={operationError(query.error, 'load this category')}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  return (
    <CategoryDetail
      key={query.data.updatedAt}
      placeId={placeId}
      category={query.data}
      permissions={permissions}
      onDeleted={onClose}
    />
  );
}

function CategoryDetailDrawer({
  placeId,
  categoryId,
  permissions,
  onClose,
}: {
  placeId: string;
  categoryId: string | null;
  permissions: MenuCategoryPermissions;
  onClose: () => void;
}) {
  return (
    <ResponsiveDrawer
      open={categoryId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      side='right'
      title='Menu category details'
      description='Edit only fields supported by the backend contract.'
    >
      {categoryId && (
        <CategoryDetailContent placeId={placeId} categoryId={categoryId} permissions={permissions} onClose={onClose} />
      )}
    </ResponsiveDrawer>
  );
}

function MenuCategoriesPanel({ placeId, permissions }: { placeId: string; permissions: MenuCategoryPermissions }) {
  const [filters, setFilters] = useState<NormalizedMenuCategoryListParams>({ page: 1, limit: 20 });
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery(menuCategoriesQueryOptions(placeId, filters));
  const columns = useMemo<ColumnDef<MenuCategory>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Category',
        cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
      },
      {
        accessorKey: 'categoryId',
        header: 'Identifier',
        cell: ({ row }) => <span className='font-mono text-xs text-muted-foreground'>{row.original.categoryId}</span>,
      },
      {
        accessorKey: 'sortOrder',
        header: 'Sort order',
        cell: ({ row }) => <span className='tabular-nums'>{row.original.sortOrder}</span>,
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
            <Button type='button' variant='ghost' size='sm' onClick={() => setSelectedId(row.original.categoryId)}>
              <EyeIcon aria-hidden /> View
            </Button>
          </div>
        ),
      },
    ],
    [],
  );
  const meta = query.data?.meta;
  const status: StatusFilter = filters.isActive === true ? 'ACTIVE' : filters.isActive === false ? 'INACTIVE' : 'ALL';

  return (
    <SectionCard
      title='Menu categories'
      description='Categories are ordered by sort order, then identifier.'
      action={
        permissions.canCreate ? (
          <Button type='button' onClick={() => setCreating(true)}>
            <PlusIcon aria-hidden /> Add category
          </Button>
        ) : undefined
      }
    >
      <DataTable
        columns={columns}
        data={query.data?.categories ?? []}
        getRowId={(category) => category.categoryId}
        isLoading={query.isPending}
        error={query.isError ? operationError(query.error, 'load menu categories') : undefined}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
        ariaLabel='Menu categories'
        emptyTitle='No menu categories'
        emptyDescription={
          status === 'ALL' ? 'Create the first category for this menu.' : 'No categories match this status filter.'
        }
        toolbar={
          <FilterBar
            activeCount={status === 'ALL' ? 0 : 1}
            onReset={() => setFilters((current) => ({ page: 1, limit: current.limit }))}
          >
            <FilterSelect<StatusFilter>
              label='Status'
              value={status}
              options={[
                { value: 'ALL', label: 'All categories' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
              onValueChange={(value) =>
                setFilters((current) => ({
                  page: 1,
                  limit: current.limit,
                  ...(value === 'ALL' ? {} : { isActive: value === 'ACTIVE' }),
                }))
              }
            />
          </FilterBar>
        }
        pagination={{
          page: filters.page,
          pageSize: filters.limit,
          totalItems: meta?.totalItems ?? 0,
          totalPages: meta?.totalPages ?? 0,
          disabled: query.isFetching,
          onPageChange: (page) => setFilters((current) => ({ ...current, page })),
          onPageSizeChange: (limit) => setFilters((current) => ({ ...current, page: 1, limit })),
        }}
      />
      {permissions.canCreate && creating && (
        <CreateCategoryDrawer placeId={placeId} open={creating} onOpenChange={setCreating} />
      )}
      <CategoryDetailDrawer
        placeId={placeId}
        categoryId={selectedId}
        permissions={permissions}
        onClose={() => setSelectedId(null)}
      />
    </SectionCard>
  );
}

function MenuCategoriesPage({ placeId }: { placeId: string }) {
  const ability = useAppAbility();
  const placeQuery = useQuery(managementPlaceQueryOptions(placeId));
  if (placeQuery.isPending) return <Skeleton className='h-96 w-full' role='status' aria-label='Loading place' />;
  if (placeQuery.isError || !placeQuery.data)
    return <ErrorState title='Could not load place' onRetry={() => void placeQuery.refetch()} />;
  const permissions = {
    canCreate: canAtPlace(ability, placeId, PERMISSION.MENU_CREATE),
    canUpdate: canAtPlace(ability, placeId, PERMISSION.MENU_UPDATE),
    canDelete: canAtPlace(ability, placeId, PERMISSION.MENU_DELETE),
  };
  return (
    <>
      <PageHeader
        title='Menu categories'
        description={`Organize the menu for ${placeQuery.data.name}.`}
        leading={
          <span className='flex size-11 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <Layers3Icon aria-hidden />
          </span>
        }
      />
      <MenuCategoriesPanel placeId={placeId} permissions={permissions} />
    </>
  );
}

export { CategoryDetail, MenuCategoriesPage, MenuCategoriesPanel, type MenuCategoryPermissions };
