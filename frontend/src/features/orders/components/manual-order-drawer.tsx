import { useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Loader2Icon, MinusIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { getSafeMutationError } from '@/utils/dashboard-error';
import { formatCurrency } from '@/utils/format-currency';

import { useCreateManualOrderMutation } from '../queries/manual-order.mutation';
import { manualOrderOptionsQueryOptions } from '../queries/manual-order.query';
import type { CreateManualOrderInput, ManualOrderOptionItem } from '../types/order.type';

type DraftLine = { item: ManualOrderOptionItem; quantity: number; note: string };

export function ManualOrderDrawer({
  placeId,
  open,
  onOpenChange,
}: {
  placeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const optionsQuery = useQuery({
    ...manualOrderOptionsQueryOptions(placeId),
    enabled: open,
  });
  const mutation = useCreateManualOrderMutation(placeId);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableId, setTableId] = useState('');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);

  const reset = () => {
    mutation.reset();
    idempotencyKey.current = crypto.randomUUID();
    setCustomerName('');
    setCustomerNote('');
    setFulfillmentType('DINE_IN');
    setTableId('');
    setSearch('');
    setLines([]);
  };
  const changeOpen = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const visibleCategories = useMemo(() => {
    const categories = optionsQuery.data?.categories ?? [];
    const query = search.trim().toLocaleLowerCase();
    if (!query) return categories;
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          `${item.name} ${item.description ?? ''}`.toLocaleLowerCase().includes(query),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [optionsQuery.data?.categories, search]);
  const subtotal = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const valid =
    customerName.trim().length >= 1 &&
    customerName.trim().length <= 100 &&
    lines.length > 0 &&
    lines.length <= 50 &&
    totalQuantity <= 200 &&
    (fulfillmentType === 'TAKEAWAY' || Boolean(tableId));

  const addItem = (item: ManualOrderOptionItem) => {
    setLines((current) => {
      const currentQuantity = current.reduce((sum, line) => sum + line.quantity, 0);
      if (currentQuantity >= 200) return current;
      const existing = current.find((line) => line.item.menuItemId === item.menuItemId);
      if (!existing && current.length >= 50) return current;
      if (!existing) return [...current, { item, quantity: 1, note: '' }];
      if (existing.quantity >= 99) return current;
      return current.map((line) =>
        line.item.menuItemId === item.menuItemId ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });
  };

  const submit = async () => {
    if (!valid) return;
    const common = {
      customerName: customerName.trim(),
      ...(customerNote.trim() ? { customerNote: customerNote.trim() } : {}),
      items: lines.map((line) => ({
        menuItemId: line.item.menuItemId,
        quantity: line.quantity,
        ...(line.note.trim() ? { note: line.note.trim() } : {}),
      })),
    };
    const input: CreateManualOrderInput =
      fulfillmentType === 'DINE_IN' ? { ...common, fulfillmentType, tableId } : { ...common, fulfillmentType };
    try {
      const order = await mutation.mutateAsync({ input, idempotencyKey: idempotencyKey.current });
      toast.success(`Manual order ${order.orderCode} created.`);
      changeOpen(false);
    } catch {
      // Render the sanitized mutation error and retain the idempotency key for retry.
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={changeOpen}
      side='right'
      title='Add manual order'
      description='Create a confirmed walk-in order without a customer account.'
    >
      {optionsQuery.isPending ? (
        <div className='flex min-h-48 items-center justify-center' role='status'>
          <Loader2Icon className='animate-spin' aria-hidden />
          <span className='sr-only'>Loading order options</span>
        </div>
      ) : optionsQuery.isError || !optionsQuery.data ? (
        <ErrorState
          compact
          title='Could not load order options'
          description={getSafeMutationError(optionsQuery.error, 'Unable to load menu items and tables.')}
          onRetry={() => void optionsQuery.refetch()}
        />
      ) : (
        <form
          className='space-y-6'
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className='space-y-2'>
            <label htmlFor='manual-customer-name' className='text-sm font-medium'>
              Customer name
            </label>
            <Input
              id='manual-customer-name'
              value={customerName}
              maxLength={100}
              disabled={mutation.isPending}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder='Customer name'
            />
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Fulfillment</label>
              <Select
                value={fulfillmentType}
                disabled={mutation.isPending}
                onValueChange={(value) => setFulfillmentType(value as 'DINE_IN' | 'TAKEAWAY')}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='DINE_IN'>Dine in</SelectItem>
                  <SelectItem value='TAKEAWAY'>Takeaway</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fulfillmentType === 'DINE_IN' && (
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Dining table</label>
                <Select value={tableId} disabled={mutation.isPending} onValueChange={setTableId}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select a table' />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsQuery.data.tables.map((table) => (
                      <SelectItem key={table.tableId} value={table.tableId}>
                        {table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className='space-y-3 border-t pt-5'>
            <div className='relative'>
              <SearchIcon
                className='pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground'
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search menu items'
                className='pl-9'
              />
            </div>
            <div className='max-h-72 space-y-4 overflow-y-auto pr-1'>
              {visibleCategories.map((category) => (
                <section key={category.categoryId} className='space-y-2'>
                  <h3 className='text-sm font-semibold'>{category.name}</h3>
                  {category.items.map((item) => (
                    <div key={item.menuItemId} className='flex items-center gap-3 rounded-md border p-2'>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt='' className='size-12 rounded object-cover' />
                      ) : (
                        <div className='size-12 rounded bg-muted' />
                      )}
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium'>{item.name}</p>
                        <p className='text-xs text-muted-foreground'>{formatCurrency(item.price)}</p>
                      </div>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={
                          totalQuantity >= 200 ||
                          (lines.length >= 50 && !lines.some((line) => line.item.menuItemId === item.menuItemId))
                        }
                        onClick={() => addItem(item)}
                      >
                        <PlusIcon aria-hidden /> Add
                      </Button>
                    </div>
                  ))}
                </section>
              ))}
              {visibleCategories.length === 0 && (
                <p className='py-6 text-center text-sm text-muted-foreground'>No available menu items found.</p>
              )}
            </div>
          </div>

          <div className='space-y-3 border-t pt-5'>
            <h3 className='font-semibold'>Order items</h3>
            {lines.length === 0 ? (
              <p className='text-sm text-muted-foreground'>Add at least one menu item.</p>
            ) : (
              lines.map((line) => (
                <div key={line.item.menuItemId} className='space-y-2 rounded-md border p-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-medium'>{line.item.name}</p>
                      <p className='text-xs text-muted-foreground'>{formatCurrency(line.item.price * line.quantity)}</p>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        type='button'
                        size='icon'
                        variant='outline'
                        aria-label={`Decrease ${line.item.name}`}
                        onClick={() =>
                          setLines((current) =>
                            current.map((candidate) =>
                              candidate.item.menuItemId === line.item.menuItemId
                                ? { ...candidate, quantity: Math.max(1, candidate.quantity - 1) }
                                : candidate,
                            ),
                          )
                        }
                      >
                        <MinusIcon aria-hidden />
                      </Button>
                      <span className='w-8 text-center text-sm tabular-nums'>{line.quantity}</span>
                      <Button
                        type='button'
                        size='icon'
                        variant='outline'
                        aria-label={`Increase ${line.item.name}`}
                        disabled={line.quantity >= 99 || totalQuantity >= 200}
                        onClick={() => addItem(line.item)}
                      >
                        <PlusIcon aria-hidden />
                      </Button>
                      <Button
                        type='button'
                        size='icon'
                        variant='ghost'
                        aria-label={`Remove ${line.item.name}`}
                        onClick={() =>
                          setLines((current) =>
                            current.filter((candidate) => candidate.item.menuItemId !== line.item.menuItemId),
                          )
                        }
                      >
                        <Trash2Icon aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={line.note}
                    maxLength={500}
                    placeholder='Item note (optional)'
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((candidate) =>
                          candidate.item.menuItemId === line.item.menuItemId
                            ? { ...candidate, note: event.target.value }
                            : candidate,
                        ),
                      )
                    }
                  />
                </div>
              ))
            )}
          </div>

          <div className='space-y-2'>
            <label htmlFor='manual-customer-note' className='text-sm font-medium'>
              Customer note
            </label>
            <Input
              id='manual-customer-note'
              value={customerNote}
              maxLength={500}
              onChange={(event) => setCustomerNote(event.target.value)}
              placeholder='Optional order note'
            />
          </div>

          <div className='flex items-center justify-between border-t pt-5'>
            <div>
              <p className='text-xs text-muted-foreground'>{totalQuantity} item(s)</p>
              <p className='font-semibold'>{formatCurrency(subtotal)}</p>
            </div>
            <Button type='submit' disabled={!valid || mutation.isPending}>
              {mutation.isPending && <Loader2Icon className='animate-spin' aria-hidden />}
              {mutation.isPending ? 'Creating…' : 'Create confirmed order'}
            </Button>
          </div>
          {mutation.isError && (
            <p role='alert' className='text-sm text-destructive'>
              {getSafeMutationError(mutation.error, 'Unable to create this manual order.')}
            </p>
          )}
        </form>
      )}
    </ResponsiveDrawer>
  );
}
