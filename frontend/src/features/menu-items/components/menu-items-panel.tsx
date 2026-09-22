import { useMemo, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon, ImageIcon, Loader2Icon, PlusIcon, Trash2Icon, UtensilsIcon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/error-state';
import { FilterBar, FilterSelect } from '@/components/ui/filter-controls';
import { Input } from '@/components/ui/input';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';

import { allMenuCategoriesQueryOptions } from '@/features/menu-categories/queries/menu-categories.query';
import type { MenuCategory } from '@/features/menu-categories/types/menu-categories.type';

import { isApplicationError } from '@/utils/api-error.util';
import { formatCurrency } from '@/utils/format-currency';

import {
  useCreateMenuItemMutation,
  useDeleteMenuItemMutation,
  useUpdateMenuItemMutation,
} from '../queries/menu-items.mutation';
import { menuItemQueryOptions, menuItemsQueryOptions } from '../queries/menu-items.query';
import {
  changedMenuItemFields,
  menuItemDescriptionSchema,
  menuItemNameSchema,
  menuItemPriceSchema,
  menuItemSortOrderSchema,
  menuItemToFormValues,
  toCreateMenuItemInput,
} from '../schemas/menu-items.schema';
import type {
  MenuItem,
  MenuItemFormValues,
  MenuItemType,
  NormalizedMenuItemListParams,
} from '../types/menu-items.type';

export type MenuItemPermissions = { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
type AvailabilityFilter = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';
type TypeFilter = 'ALL' | MenuItemType;

const useMenuItemForm = (defaultValues: MenuItemFormValues, onSubmit: (values: MenuItemFormValues) => Promise<void>) =>
  useForm({ defaultValues, onSubmit: ({ value }) => onSubmit(value) });
type MenuItemFormApi = ReturnType<typeof useMenuItemForm>;

const fieldMessage = (errors: unknown[], touched: boolean) => {
  if (!touched) return undefined;
  const error = errors[0];
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
    return error.message;
  return undefined;
};

const issueMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'issues' in error)
    return (error as { issues?: { message?: string }[] }).issues?.[0]?.message ?? fallback;
  return fallback;
};

const operationError = (error: unknown, operation: string) => {
  if (!isApplicationError(error)) return `Unable to ${operation}. Please try again.`;
  if (error.httpStatus === 403) return `You no longer have permission to ${operation}.`;
  if (error.httpStatus === 404) return 'This menu item or category is unavailable or outside your access.';
  if (error.httpStatus === 409) return error.message;
  if (error.isNetworkError) return `Could not reach the server to ${operation}. Please try again.`;
  return error.message;
};

function AvailabilityControl({
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
      {value ? 'Available' : 'Unavailable'}
    </Button>
  );
}

function MenuItemFields({
  form,
  categories,
  disabled,
  formError,
  onChange,
}: {
  form: MenuItemFormApi;
  categories: MenuCategory[];
  disabled?: boolean;
  formError?: string;
  onChange: () => void;
}) {
  return (
    <div className='space-y-5'>
      <form.Field name='name' validators={{ onBlur: menuItemNameSchema }}>
        {(field) => (
          <FormField error={formError ?? fieldMessage(field.state.meta.errors, field.state.meta.isTouched)}>
            <FormLabel>Item name</FormLabel>
            <FormControl>
              <Input
                value={field.state.value}
                disabled={disabled}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  onChange();
                  field.handleChange(e.target.value);
                }}
                placeholder='e.g. Nasi goreng'
              />
            </FormControl>
            <FormMessage />
          </FormField>
        )}
      </form.Field>
      <form.Field name='categoryId'>
        {(field) => (
          <FormField error={fieldMessage(field.state.meta.errors, field.state.meta.isTouched)}>
            <FormLabel>Category</FormLabel>
            <Select
              value={field.state.value || undefined}
              disabled={disabled}
              onValueChange={(value) => {
                onChange();
                field.handleChange(value);
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.categoryId} value={category.categoryId}>
                    {category.name}
                    {category.isActive ? '' : ' (inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormField>
        )}
      </form.Field>
      <div className='grid gap-5 sm:grid-cols-2'>
        <form.Field name='type'>
          {(field) => (
            <FormField>
              <FormLabel>Type</FormLabel>
              <Select
                value={field.state.value}
                disabled={disabled}
                onValueChange={(value) => {
                  onChange();
                  field.handleChange(value as MenuItemType);
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='FOOD'>Food</SelectItem>
                  <SelectItem value='DRINK'>Drink</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>
        <form.Field name='price' validators={{ onBlur: menuItemPriceSchema }}>
          {(field) => (
            <FormField error={fieldMessage(field.state.meta.errors, field.state.meta.isTouched)}>
              <FormLabel>Price (IDR)</FormLabel>
              <FormControl>
                <Input
                  type='text'
                  inputMode='decimal'
                  value={field.state.value}
                  disabled={disabled}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    onChange();
                    field.handleChange(e.target.value);
                  }}
                  placeholder='15000'
                />
              </FormControl>
              <FormMessage />
            </FormField>
          )}
        </form.Field>
      </div>
      <form.Field name='description' validators={{ onBlur: menuItemDescriptionSchema }}>
        {(field) => (
          <FormField error={fieldMessage(field.state.meta.errors, field.state.meta.isTouched)}>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <textarea
                className='min-h-24 w-full rounded-md border border-input bg-form px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50'
                value={field.state.value}
                disabled={disabled}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  onChange();
                  field.handleChange(e.target.value);
                }}
                placeholder='Optional description'
              />
            </FormControl>
            <FormMessage />
          </FormField>
        )}
      </form.Field>
      <form.Field name='sortOrder' validators={{ onBlur: menuItemSortOrderSchema }}>
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
                onChange={(e) => {
                  onChange();
                  field.handleChange(e.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormField>
        )}
      </form.Field>
      <form.Field name='isAvailable'>
        {(field) => (
          <div className='space-y-2'>
            <p className='text-sm font-medium'>Availability</p>
            <AvailabilityControl
              value={field.state.value}
              disabled={disabled}
              onChange={(value) => {
                onChange();
                field.handleChange(value);
              }}
            />
            <p className='text-xs text-muted-foreground'>Unavailable items are hidden from ordering.</p>
          </div>
        )}
      </form.Field>
    </div>
  );
}

function CreateItemDrawer({
  placeId,
  categories,
  open,
  onOpenChange,
}: {
  placeId: string;
  categories: MenuCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateMenuItemMutation(placeId);
  const [formError, setFormError] = useState<string>();
  const form = useMenuItemForm(menuItemToFormValues(), async (value) => {
    setFormError(undefined);
    try {
      const item = await mutation.mutateAsync(toCreateMenuItemInput(value));
      toast.success(`${item.name} created.`);
      onOpenChange(false);
    } catch (error) {
      if (!isApplicationError(error)) setFormError(issueMessage(error, 'Check the menu item fields.'));
    }
  });
  const changeOpen = (next: boolean) => {
    if (!next) {
      setFormError(undefined);
      mutation.reset();
      form.reset();
    }
    onOpenChange(next);
  };
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={changeOpen}
      side='right'
      title='Create menu item'
      description='Add an item to this place menu.'
    >
      <form
        className='space-y-5'
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <MenuItemFields
          form={form}
          categories={categories}
          formError={formError}
          onChange={() => setFormError(undefined)}
        />
        {mutation.isError && !formError && (
          <p role='alert' className='text-sm text-destructive'>
            {operationError(mutation.error, 'create this menu item')}
          </p>
        )}
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={() => changeOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
            {([values, isSubmitting]) => {
              let valid = true;
              try {
                toCreateMenuItemInput(values);
              } catch {
                valid = false;
              }
              return (
                <Button type='submit' disabled={!valid || isSubmitting || mutation.isPending}>
                  {isSubmitting || mutation.isPending ? (
                    <Loader2Icon className='animate-spin' aria-hidden />
                  ) : (
                    <PlusIcon aria-hidden />
                  )}
                  {isSubmitting || mutation.isPending ? 'Creating…' : 'Create item'}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
      </form>
    </ResponsiveDrawer>
  );
}

export function ItemDetail({
  placeId,
  item,
  categories,
  permissions,
  onDeleted,
}: {
  placeId: string;
  item: MenuItem;
  categories: MenuCategory[];
  permissions: MenuItemPermissions;
  onDeleted: () => void;
}) {
  const updateMutation = useUpdateMenuItemMutation(placeId, item.menuItemId);
  const deleteMutation = useDeleteMenuItemMutation(placeId, item.menuItemId);
  const [formError, setFormError] = useState<string>();
  const [deleteError, setDeleteError] = useState<string>();
  const form = useMenuItemForm(menuItemToFormValues(item), async (value) => {
    setFormError(undefined);
    try {
      const updated = await updateMutation.mutateAsync(changedMenuItemFields(value, item));
      toast.success(`${updated.name} updated.`);
    } catch (error) {
      if (!isApplicationError(error)) setFormError(issueMessage(error, 'Change at least one field.'));
    }
  });
  const remove = async () => {
    setDeleteError(undefined);
    try {
      await deleteMutation.mutateAsync();
      toast.success(`${item.name} deleted.`);
      onDeleted();
    } catch (error) {
      setDeleteError(operationError(error, 'delete this menu item'));
    }
  };
  return (
    <form
      className='space-y-5'
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <MenuItemFields
        form={form}
        categories={categories}
        disabled={!permissions.canUpdate || updateMutation.isPending}
        formError={formError}
        onChange={() => setFormError(undefined)}
      />
      <div className='space-y-1 border-t pt-4 text-xs text-muted-foreground'>
        <p>Menu item ID</p>
        <p className='break-all font-mono'>{item.menuItemId}</p>
      </div>
      {updateMutation.isError && !formError && (
        <p role='alert' className='text-sm text-destructive'>
          {operationError(updateMutation.error, 'update this menu item')}
        </p>
      )}
      {deleteError && (
        <p role='alert' className='text-sm text-destructive'>
          {deleteError}
        </p>
      )}
      <div className='flex items-center justify-between gap-2 border-t pt-5'>
        {permissions.canDelete ? (
          <ConfirmDialog
            title={`Delete “${item.name}”?`}
            description='This soft-deletes the item, marks it unavailable, and removes it from active carts.'
            confirmLabel='Delete menu item'
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
              let changed = true;
              try {
                changedMenuItemFields(values, item);
              } catch {
                changed = false;
              }
              return (
                <Button
                  type='submit'
                  disabled={!changed || isSubmitting || updateMutation.isPending || deleteMutation.isPending}
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

function ItemDetailContent({
  placeId,
  menuItemId,
  categories,
  permissions,
  onClose,
}: {
  placeId: string;
  menuItemId: string;
  categories: MenuCategory[];
  permissions: MenuItemPermissions;
  onClose: () => void;
}) {
  const query = useQuery(menuItemQueryOptions(placeId, menuItemId));
  if (query.isPending) return <Skeleton className='h-96 w-full' role='status' aria-label='Loading menu item' />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        compact
        title='Could not load menu item'
        description={operationError(query.error, 'load this menu item')}
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  return (
    <ItemDetail
      key={query.data.updatedAt}
      placeId={placeId}
      item={query.data}
      categories={categories}
      permissions={permissions}
      onDeleted={onClose}
    />
  );
}

export function MenuItemsPanel({ placeId, permissions }: { placeId: string; permissions: MenuItemPermissions }) {
  const [filters, setFilters] = useState<NormalizedMenuItemListParams>({ page: 1, limit: 20 });
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery(menuItemsQueryOptions(placeId, filters));
  const categoriesQuery = useQuery(allMenuCategoriesQueryOptions(placeId));
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.categoryId, category.name])),
    [categories],
  );
  const columns = useMemo<ColumnDef<MenuItem>[]>(
    () => [
      {
        id: 'image',
        header: 'Image',
        cell: ({ row }) =>
          row.original.imageUrl ? (
            <img src={row.original.imageUrl} alt='' className='size-12 rounded-md object-cover' />
          ) : (
            <span
              className='flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground'
              aria-label='No image'
            >
              <ImageIcon aria-hidden />
            </span>
          ),
      },
      {
        accessorKey: 'name',
        header: 'Item',
        cell: ({ row }) => <span className='font-medium'>{row.original.name}</span>,
      },
      { accessorKey: 'type', header: 'Type', cell: ({ row }) => (row.original.type === 'FOOD' ? 'Food' : 'Drink') },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }) => categoryNames.get(row.original.categoryId) ?? 'Unknown category',
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => <span className='tabular-nums'>{formatCurrency(row.original.price)}</span>,
      },
      {
        accessorKey: 'isAvailable',
        header: 'Availability',
        cell: ({ row }) => (
          <StatusBadge tone={row.original.isAvailable ? 'success' : 'neutral'} showDot>
            {row.original.isAvailable ? 'Available' : 'Unavailable'}
          </StatusBadge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Actions</span>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Button type='button' variant='ghost' size='sm' onClick={() => setSelectedId(row.original.menuItemId)}>
              <EyeIcon aria-hidden /> View
            </Button>
          </div>
        ),
      },
    ],
    [categoryNames],
  );
  const type: TypeFilter = filters.type ?? 'ALL';
  const availability: AvailabilityFilter =
    filters.isAvailable === true ? 'AVAILABLE' : filters.isAvailable === false ? 'UNAVAILABLE' : 'ALL';
  const category = filters.categoryId ?? 'ALL';
  const activeCount = Number(type !== 'ALL') + Number(category !== 'ALL') + Number(availability !== 'ALL');
  const setFilter = (patch: Partial<NormalizedMenuItemListParams>) =>
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  return (
    <SectionCard
      title='Menu items'
      description='Items are ordered by category and item sort order.'
      action={
        permissions.canCreate ? (
          <Button type='button' onClick={() => setCreating(true)} disabled={categories.length === 0}>
            <PlusIcon aria-hidden /> Add menu item
          </Button>
        ) : undefined
      }
    >
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        getRowId={(item) => item.menuItemId}
        isLoading={query.isPending}
        error={
          query.isError
            ? operationError(query.error, 'load menu items')
            : categoriesQuery.isError
              ? operationError(categoriesQuery.error, 'load menu categories')
              : undefined
        }
        onRetry={() => {
          void query.refetch();
          void categoriesQuery.refetch();
        }}
        isRetrying={query.isFetching || categoriesQuery.isFetching}
        ariaLabel='Menu items'
        emptyTitle={activeCount ? 'No menu items match these filters' : 'No menu items'}
        emptyDescription={
          activeCount
            ? 'Reset or change the filters to see more items.'
            : categories.length
              ? 'Create the first item for this menu.'
              : 'Create a menu category before adding items.'
        }
        toolbar={
          <FilterBar
            activeCount={activeCount}
            onReset={() => setFilters((current) => ({ page: 1, limit: current.limit }))}
          >
            <FilterSelect<TypeFilter>
              label='Type'
              value={type}
              options={[
                { value: 'ALL', label: 'All types' },
                { value: 'FOOD', label: 'Food' },
                { value: 'DRINK', label: 'Drink' },
              ]}
              onValueChange={(value) => setFilter({ type: value === 'ALL' ? undefined : value })}
            />
            <FilterSelect
              label='Category'
              value={category}
              disabled={categoriesQuery.isPending}
              options={[
                { value: 'ALL', label: 'All categories' },
                ...categories.map((item) => ({
                  value: item.categoryId,
                  label: `${item.name}${item.isActive ? '' : ' (inactive)'}`,
                })),
              ]}
              onValueChange={(value) => setFilter({ categoryId: value === 'ALL' ? undefined : value })}
            />
            <FilterSelect<AvailabilityFilter>
              label='Availability'
              value={availability}
              options={[
                { value: 'ALL', label: 'All items' },
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'UNAVAILABLE', label: 'Unavailable' },
              ]}
              onValueChange={(value) => setFilter({ isAvailable: value === 'ALL' ? undefined : value === 'AVAILABLE' })}
            />
          </FilterBar>
        }
        pagination={{
          page: filters.page,
          pageSize: filters.limit,
          totalItems: query.data?.meta.totalItems ?? 0,
          totalPages: query.data?.meta.totalPages ?? 0,
          disabled: query.isFetching,
          onPageChange: (page) => setFilters((current) => ({ ...current, page })),
          onPageSizeChange: (limit) => setFilters((current) => ({ ...current, page: 1, limit })),
        }}
      />
      {permissions.canCreate && creating && (
        <CreateItemDrawer placeId={placeId} categories={categories} open={creating} onOpenChange={setCreating} />
      )}
      <ResponsiveDrawer
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        side='right'
        title='Menu item details'
        description='Edit fields supported by the backend contract.'
      >
        {selectedId && (
          <ItemDetailContent
            placeId={placeId}
            menuItemId={selectedId}
            categories={categories}
            permissions={permissions}
            onClose={() => setSelectedId(null)}
          />
        )}
      </ResponsiveDrawer>
    </SectionCard>
  );
}

export function MenuItemsIcon() {
  return <UtensilsIcon aria-hidden />;
}
