import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FilterIcon, RefreshCwIcon, ShoppingBagIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { isApplicationError } from '@/utils/api-error.util';
import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { formatCurrency } from '@/utils/format-currency';
import { formatTimeAgo } from '@/utils/format-time-ago.util';
import { cn } from '@/utils/utils';

import { ownOrderListQueryOptions } from '../queries/order-list.query';
import {
  customerOrderSearchToListParams,
  isValidCustomerOrderPlaceId,
  type NormalizedCustomerOrderSearch,
} from '../schemas/customer-order-list.schema';
import {
  FULFILLMENT_TYPE,
  type FulfillmentType,
  ORDER_STATUS,
  type OrderStatus,
  type OrderSummary,
} from '../types/order.type';

import { OrderStatusBadge, orderStatusPresentation } from './order-status-badge';

type CustomerOrdersPageProps = {
  filters: NormalizedCustomerOrderSearch;
  currentUrl: string;
  onFiltersChange: (filters: NormalizedCustomerOrderSearch, options?: { replace?: boolean }) => void;
};

const ACTIVE_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
]);

const statusOptions = [
  { value: 'ALL', label: 'All statuses' },
  ...Object.values(ORDER_STATUS).map((status) => ({ value: status, label: orderStatusPresentation[status].label })),
] as const;

const fulfillmentOptions = [
  { value: 'ALL', label: 'All fulfillment' },
  { value: FULFILLMENT_TYPE.DINE_IN, label: 'Dine in' },
  { value: FULFILLMENT_TYPE.TAKEAWAY, label: 'Takeaway' },
] as const;

const fulfillmentLabel = (order: OrderSummary) =>
  order.fulfillmentType === FULFILLMENT_TYPE.DINE_IN
    ? order.diningTableName
      ? `Dine in · ${order.diningTableName}`
      : 'Dine in'
    : 'Takeaway';

const exactDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function CustomerOrdersSkeleton() {
  return (
    <div className='space-y-3' role='status' aria-label='Loading your orders'>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className='rounded-surface border bg-surface p-4 sm:p-5'>
          <div className='flex items-start justify-between gap-4'>
            <div className='w-2/3 space-y-3'>
              <Skeleton className='h-5 w-3/4' />
              <Skeleton className='h-6 w-full max-w-72' />
            </div>
            <Skeleton className='h-7 w-24 rounded-full' />
          </div>
          <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3'>
            <Skeleton className='h-12' />
            <Skeleton className='h-12' />
            <Skeleton className='h-12' />
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerOrderCard({ order }: { order: OrderSummary }) {
  const active = ACTIVE_STATUSES.has(order.status);
  const absoluteCreatedAt = exactDateTime(order.createdAt);

  return (
    <article
      className={cn(
        'rounded-surface border bg-surface p-4 shadow-xs transition-shadow focus-within:ring-2 focus-within:ring-ring sm:p-5',
        active ? 'border-primary/35' : 'border-border bg-surface/80',
      )}
    >
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <p className='wrap-break-word text-sm font-semibold text-primary'>{order.place.name}</p>
          <Link
            to='/orders/$orderId'
            params={{ orderId: order.orderId }}
            state={{ fromCustomerOrders: true }}
            className='mt-1 block min-h-11 select-all break-all rounded-sm font-mono text-lg font-bold tracking-wide focus-visible:outline-none sm:text-xl'
          >
            {order.orderCode}
          </Link>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <OrderStatusBadge status={order.status} />
          <span className='text-xs font-medium text-muted-foreground'>{active ? 'Active order' : 'Past order'}</span>
        </div>
      </div>

      <dl className='mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3'>
        <div>
          <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Fulfillment</dt>
          <dd className='mt-1 wrap-break-word font-medium'>{fulfillmentLabel(order)}</dd>
        </div>
        <div>
          <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Subtotal</dt>
          <dd className='mt-1 font-semibold tabular-nums'>{formatCurrency(order.subtotal)}</dd>
        </div>
        <div>
          <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Created</dt>
          <dd className='mt-1'>
            <time dateTime={order.createdAt} title={absoluteCreatedAt} aria-label={`Created ${absoluteCreatedAt}`}>
              {formatTimeAgo(order.createdAt)}
            </time>
          </dd>
        </div>
      </dl>
    </article>
  );
}

function FilterFields({
  idPrefix,
  status,
  fulfillmentType,
  placeId,
  onStatusChange,
  onFulfillmentChange,
  onPlaceIdChange,
}: {
  idPrefix: string;
  status?: OrderStatus;
  fulfillmentType?: FulfillmentType;
  placeId: string;
  onStatusChange: (status?: OrderStatus) => void;
  onFulfillmentChange: (fulfillmentType?: FulfillmentType) => void;
  onPlaceIdChange: (placeId: string) => void;
}) {
  const placeIdValid = isValidCustomerOrderPlaceId(placeId);

  return (
    <>
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-status`}>Status</Label>
        <Select
          value={status ?? 'ALL'}
          onValueChange={(value) => onStatusChange(value === 'ALL' ? undefined : (value as OrderStatus))}
        >
          <SelectTrigger id={`${idPrefix}-status`} className='h-11 w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-fulfillment`}>Fulfillment</Label>
        <Select
          value={fulfillmentType ?? 'ALL'}
          onValueChange={(value) => onFulfillmentChange(value === 'ALL' ? undefined : (value as FulfillmentType))}
        >
          <SelectTrigger id={`${idPrefix}-fulfillment`} className='h-11 w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fulfillmentOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor={`${idPrefix}-place-id`}>Exact place ID</Label>
        <Input
          id={`${idPrefix}-place-id`}
          value={placeId}
          placeholder='Place UUID'
          spellCheck={false}
          aria-invalid={!placeIdValid || undefined}
          aria-describedby={`${idPrefix}-place-id-help`}
          onChange={(event) => onPlaceIdChange(event.target.value)}
        />
        <p
          id={`${idPrefix}-place-id-help`}
          className={cn('text-xs', placeIdValid ? 'text-muted-foreground' : 'text-destructive')}
          role={placeIdValid ? undefined : 'alert'}
        >
          {placeIdValid ? 'Use the exact UUID supplied by the place.' : 'Enter a valid place UUID.'}
        </p>
      </div>
    </>
  );
}

function DesktopOrderFilters({
  filters,
  updateFilters,
}: {
  filters: NormalizedCustomerOrderSearch;
  updateFilters: (patch: Partial<NormalizedCustomerOrderSearch>) => void;
}) {
  const [placeId, setPlaceId] = useState(filters.placeId ?? '');

  const applyPlace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidCustomerOrderPlaceId(placeId)) return;
    updateFilters({ placeId: placeId.trim().toLowerCase() || undefined });
  };

  return (
    <form
      className='hidden grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(17rem,1.5fr)_auto] items-start gap-3 rounded-surface border bg-surface p-4 md:grid'
      aria-label='Filter orders'
      onSubmit={applyPlace}
    >
      <FilterFields
        idPrefix='desktop-order-filter'
        status={filters.status}
        fulfillmentType={filters.fulfillmentType}
        placeId={placeId}
        onStatusChange={(status) => updateFilters({ status })}
        onFulfillmentChange={(fulfillmentType) => updateFilters({ fulfillmentType })}
        onPlaceIdChange={setPlaceId}
      />
      <Button type='submit' variant='outline' className='mt-6' disabled={!isValidCustomerOrderPlaceId(placeId)}>
        Apply place
      </Button>
    </form>
  );
}

export function CustomerOrdersPage({ filters, currentUrl, onFiltersChange }: CustomerOrdersPageProps) {
  const params = useMemo(() => customerOrderSearchToListParams(filters), [filters]);
  const query = useQuery(ownOrderListQueryOptions(params));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobileStatus, setMobileStatus] = useState<OrderStatus | undefined>(filters.status);
  const [mobileFulfillment, setMobileFulfillment] = useState<FulfillmentType | undefined>(filters.fulfillmentType);
  const [mobilePlaceId, setMobilePlaceId] = useState(filters.placeId ?? '');
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusResultsAfterLoadRef = useRef(false);
  const meta = query.data?.meta;
  const totalItems = meta?.totalItems ?? 0;
  const totalPages = meta?.totalPages ?? 0;
  const orders = query.data?.orders ?? [];
  const activeFilterCount =
    Number(Boolean(filters.status)) + Number(Boolean(filters.fulfillmentType)) + Number(Boolean(filters.placeId));
  const hasFilters = activeFilterCount > 0;
  const correctingPage = Boolean(meta && totalItems > 0 && filters.page > Math.max(1, totalPages));

  useEffect(() => {
    if (meta && totalItems > 0 && filters.page > Math.max(1, totalPages)) {
      onFiltersChange({ ...filters, page: Math.max(1, totalPages) }, { replace: true });
    }
  }, [filters, meta, onFiltersChange, totalItems, totalPages]);

  useEffect(() => {
    if (focusResultsAfterLoadRef.current && !query.isFetching && query.data?.meta.page === filters.page) {
      resultsHeadingRef.current?.focus();
      focusResultsAfterLoadRef.current = false;
    }
  }, [filters.page, query.data?.meta.page, query.isFetching]);

  const updateFilters = (patch: Partial<NormalizedCustomerOrderSearch>, replace = true) => {
    onFiltersChange({ ...filters, ...patch, page: patch.page ?? 1 }, { replace });
  };

  const clearFilters = () => {
    setMobileStatus(undefined);
    setMobileFulfillment(undefined);
    setMobilePlaceId('');
    onFiltersChange({ page: 1, limit: filters.limit }, { replace: true });
    setSheetOpen(false);
  };

  const changeSheetOpen = (open: boolean) => {
    if (open) {
      setMobileStatus(filters.status);
      setMobileFulfillment(filters.fulfillmentType);
      setMobilePlaceId(filters.placeId ?? '');
    }
    setSheetOpen(open);
  };

  const applyMobileFilters = () => {
    if (!isValidCustomerOrderPlaceId(mobilePlaceId)) return;
    updateFilters({
      status: mobileStatus,
      fulfillmentType: mobileFulfillment,
      placeId: mobilePlaceId.trim().toLowerCase() || undefined,
    });
    setSheetOpen(false);
  };

  const errorPresentation = getCustomerErrorPresentation(query.error);
  const signedOut = isApplicationError(query.error) && query.error.httpStatus === 401;
  const notFound = isApplicationError(query.error) && query.error.httpStatus === 404;

  return (
    <div className='px-page py-6 sm:py-10'>
      <div className='mx-auto w-full max-w-5xl space-y-6'>
        <header className='flex flex-wrap items-start justify-between gap-4'>
          <div className='max-w-2xl'>
            <p className='text-sm font-semibold text-primary'>Order history</p>
            <h1 className='mt-1 text-3xl font-bold tracking-tight sm:text-4xl'>My orders</h1>
            <p className='mt-2 text-muted-foreground'>Track active orders and revisit your order history.</p>
          </div>
          <Button type='button' variant='outline' onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCwIcon
              className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : undefined}
              aria-hidden
            />
            {query.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </header>

        <div className='flex items-center justify-between gap-3 md:hidden'>
          <Sheet open={sheetOpen} onOpenChange={changeSheetOpen}>
            <SheetTrigger asChild>
              <Button type='button' variant='outline' className='min-h-11'>
                <FilterIcon aria-hidden /> Filters
                {activeFilterCount > 0 && <span aria-hidden>({activeFilterCount})</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side='bottom' className='max-h-[90vh] overflow-y-auto rounded-t-xl'>
              <SheetHeader>
                <SheetTitle>Filter orders</SheetTitle>
                <SheetDescription>Filter using only fields supported by your order history.</SheetDescription>
              </SheetHeader>
              <div className='grid gap-5 px-card'>
                <FilterFields
                  idPrefix='mobile-order-filter'
                  status={mobileStatus}
                  fulfillmentType={mobileFulfillment}
                  placeId={mobilePlaceId}
                  onStatusChange={setMobileStatus}
                  onFulfillmentChange={setMobileFulfillment}
                  onPlaceIdChange={setMobilePlaceId}
                />
              </div>
              <SheetFooter className='grid grid-cols-2'>
                <Button type='button' variant='outline' onClick={clearFilters}>
                  Clear all
                </Button>
                <Button
                  type='button'
                  onClick={applyMobileFilters}
                  disabled={!isValidCustomerOrderPlaceId(mobilePlaceId)}
                >
                  Apply filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          {meta && <p className='text-sm text-muted-foreground'>{totalItems} orders</p>}
        </div>

        <DesktopOrderFilters
          key={filters.placeId ?? ''}
          filters={filters}
          updateFilters={(patch) => updateFilters(patch)}
        />

        {hasFilters && (
          <div className='flex flex-wrap items-center gap-2' aria-label='Active order filters'>
            {filters.status && (
              <Button type='button' variant='outline' size='sm' onClick={() => updateFilters({ status: undefined })}>
                {orderStatusPresentation[filters.status].label} <XIcon aria-hidden />
              </Button>
            )}
            {filters.fulfillmentType && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => updateFilters({ fulfillmentType: undefined })}
              >
                {filters.fulfillmentType === FULFILLMENT_TYPE.DINE_IN ? 'Dine in' : 'Takeaway'} <XIcon aria-hidden />
              </Button>
            )}
            {filters.placeId && (
              <Button type='button' variant='outline' size='sm' onClick={() => updateFilters({ placeId: undefined })}>
                Place: {filters.placeId} <XIcon aria-hidden />
              </Button>
            )}
            <Button type='button' variant='ghost' size='sm' onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        <section aria-labelledby='customer-orders-results' aria-busy={query.isFetching} className='space-y-4'>
          <div className='flex min-h-8 items-center justify-between gap-3'>
            <h2 id='customer-orders-results' ref={resultsHeadingRef} tabIndex={-1} className='text-xl font-semibold'>
              Orders
            </h2>
            {meta && <p className='hidden text-sm text-muted-foreground md:block'>{totalItems} orders</p>}
          </div>

          {query.isFetching && !query.isPending && query.data && !query.isError && (
            <div className='flex items-center gap-2 text-sm text-muted-foreground' role='status'>
              <span className='size-2 rounded-full bg-info' aria-hidden /> Updating your orders…
            </div>
          )}

          {query.isError && query.data && (
            <div
              role='alert'
              className='flex flex-wrap items-center justify-between gap-3 rounded-surface border border-warning/40 bg-warning/10 p-4 text-sm'
            >
              <p>The latest update could not be loaded. Your previous orders remain visible.</p>
              <Button type='button' variant='outline' size='sm' onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          )}

          {query.isPending || correctingPage ? (
            <CustomerOrdersSkeleton />
          ) : query.isError && !query.data ? (
            <ErrorState
              title={errorPresentation.title}
              description={errorPresentation.description}
              tone={errorPresentation.tone}
              onRetry={
                errorPresentation.action === 'retry' || errorPresentation.action === 'refresh'
                  ? () => void query.refetch()
                  : undefined
              }
              isRetrying={query.isFetching}
              secondaryAction={
                signedOut ? (
                  <Button variant='outline' asChild>
                    <Link to='/login' search={{ redirect: currentUrl }}>
                      Sign in again
                    </Link>
                  </Button>
                ) : notFound ? (
                  <Button variant='outline' asChild>
                    <Link to='/'>Browse places</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ShoppingBagIcon}
              title={hasFilters ? 'No matching orders' : 'No orders yet'}
              description={
                hasFilters
                  ? 'Try changing or clearing your order filters.'
                  : 'Orders you place will appear here, newest first.'
              }
              action={
                hasFilters ? (
                  <Button type='button' variant='outline' onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to='/'>Browse places</Link>
                  </Button>
                )
              }
            />
          ) : (
            <div className='space-y-3' aria-label='Your orders'>
              {orders.map((order) => (
                <CustomerOrderCard key={order.orderId} order={order} />
              ))}
            </div>
          )}

          {!query.isPending && query.data && totalItems > 0 && (
            <Pagination
              page={filters.page}
              pageSize={filters.limit}
              totalItems={totalItems}
              totalPages={totalPages}
              disabled={query.isFetching}
              onPageChange={(page) => {
                focusResultsAfterLoadRef.current = true;
                updateFilters({ page }, false);
              }}
              onPageSizeChange={(limit) => updateFilters({ page: 1, limit })}
            />
          )}
        </section>

        <p className='sr-only' aria-live='polite' aria-atomic='true'>
          {query.isFetching && !query.isPending ? 'Updating your orders.' : meta ? `${totalItems} orders.` : ''}
        </p>
      </div>
    </div>
  );
}

export { CustomerOrderCard, CustomerOrdersSkeleton };
