import { useMemo, useState } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EyeIcon, RefreshCwIcon, ShoppingBagIcon } from 'lucide-react';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterBar, FilterSelect } from '@/components/ui/filter-controls';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { getDashboardErrorPresentation, getDashboardErrorTone } from '@/utils/dashboard-error';
import { formatCurrency } from '@/utils/format-currency';
import { formatTimeAgo } from '@/utils/format-time-ago.util';
import { cn } from '@/utils/utils';

import { orderListQueryOptions } from '../queries/order-list.query';
import type { OrderQueueSearch } from '../schemas/order-list.schema';
import {
  FULFILLMENT_TYPE,
  type FulfillmentType,
  ORDER_STATUS,
  type OrderStatus,
  type OrderSummary,
} from '../types/order.type';

import { OrderDetailDrawer } from './order-detail-drawer';
import { OrderStatusBadge, orderStatusPresentation } from './order-status-badge';

type OrderQueuePageProps = {
  placeId: string;
  placeName: string;
  filters: OrderQueueSearch;
  onFiltersChange: (filters: OrderQueueSearch) => void;
};

type StatusFilter = OrderStatus | 'ALL';
type FulfillmentFilter = FulfillmentType | 'ALL';

const statusOptions = [
  { value: 'ALL', label: 'All statuses' },
  ...Object.values(ORDER_STATUS).map((status) => ({ value: status, label: orderStatusPresentation[status].label })),
] satisfies { value: StatusFilter; label: string }[];

const fulfillmentOptions = [
  { value: 'ALL', label: 'All fulfillment' },
  { value: FULFILLMENT_TYPE.DINE_IN, label: 'Dine in' },
  { value: FULFILLMENT_TYPE.TAKEAWAY, label: 'Takeaway' },
] satisfies { value: FulfillmentFilter; label: string }[];

const fulfillmentLabel = (order: OrderSummary) =>
  order.fulfillmentType === FULFILLMENT_TYPE.DINE_IN
    ? order.diningTableName
      ? `Dine in · ${order.diningTableName}`
      : 'Dine in'
    : 'Takeaway';

function OrderReceivedTime({ createdAt }: { createdAt: string }) {
  const absolute = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(createdAt),
  );

  return (
    <time dateTime={createdAt} title={absolute} aria-label={`Received ${absolute}`} className='text-muted-foreground'>
      {formatTimeAgo(createdAt)}
    </time>
  );
}

function attentionClassName(status: OrderStatus) {
  return orderStatusPresentation[status].attentionClassName;
}

function OrderQueueResults({
  orders,
  onViewOrder,
  showPlace = false,
}: {
  orders: OrderSummary[];
  onViewOrder: (orderId: string) => void;
  showPlace?: boolean;
}) {
  return (
    <>
      <div className='space-y-3 md:hidden' aria-label='Operational orders'>
        {orders.map((order) => (
          <article
            key={order.orderId}
            className={cn('space-y-4 rounded-lg border bg-surface p-4', attentionClassName(order.status))}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='font-semibold tabular-nums'>{order.orderCode}</p>
                <p className='truncate text-sm text-muted-foreground'>{order.customerName}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <dl className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
              {showPlace && (
                <>
                  <dt className='text-muted-foreground'>Place</dt>
                  <dd className='truncate text-right'>{order.place.name}</dd>
                </>
              )}
              <dt className='text-muted-foreground'>Fulfillment</dt>
              <dd className='truncate text-right'>{fulfillmentLabel(order)}</dd>
              <dt className='text-muted-foreground'>Subtotal</dt>
              <dd className='text-right font-medium tabular-nums'>{formatCurrency(order.subtotal)}</dd>
              <dt className='text-muted-foreground'>Received</dt>
              <dd className='text-right'>
                <OrderReceivedTime createdAt={order.createdAt} />
              </dd>
            </dl>
            <Button type='button' variant='outline' className='w-full' onClick={() => onViewOrder(order.orderId)}>
              <EyeIcon aria-hidden /> View order
            </Button>
          </article>
        ))}
      </div>

      <div className='hidden overflow-hidden rounded-lg border md:block'>
        <Table aria-label='Operational orders'>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              {showPlace && <TableHead>Place</TableHead>}
              <TableHead>Fulfillment</TableHead>
              <TableHead className='text-right'>Subtotal</TableHead>
              <TableHead className='text-right'>Received</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.orderId} className={attentionClassName(order.status)}>
                <TableCell>
                  <span className='block font-semibold tabular-nums'>{order.orderCode}</span>
                  <span className='block max-w-52 truncate text-xs text-muted-foreground'>{order.customerName}</span>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                {showPlace && <TableCell className='max-w-52 truncate'>{order.place.name}</TableCell>}
                <TableCell>{fulfillmentLabel(order)}</TableCell>
                <TableCell className='text-right font-medium tabular-nums'>{formatCurrency(order.subtotal)}</TableCell>
                <TableCell className='text-right'>
                  <OrderReceivedTime createdAt={order.createdAt} />
                </TableCell>
                <TableCell className='text-right'>
                  <Button type='button' variant='ghost' size='sm' onClick={() => onViewOrder(order.orderId)}>
                    <EyeIcon aria-hidden /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function OrderQueuePage({ placeId, placeName, filters, onFiltersChange }: OrderQueuePageProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const params = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.fulfillmentType ? { fulfillmentType: filters.fulfillmentType } : {}),
    }),
    [filters.fulfillmentType, filters.limit, filters.page, filters.status],
  );
  const options = orderListQueryOptions({ kind: 'place', placeId }, params);
  const query = useQuery({ ...options, placeholderData: keepPreviousData });
  const errorPresentation = getDashboardErrorPresentation(query.error);
  const activeFilterCount = Number(Boolean(filters.status)) + Number(Boolean(filters.fulfillmentType));
  const hasFilters = activeFilterCount > 0;
  const meta = query.data?.meta;
  const update = (patch: Partial<OrderQueueSearch>) =>
    onFiltersChange({ ...filters, ...patch, placeId, page: patch.page ?? 1 });

  return (
    <>
      <PageHeader
        title='Orders'
        description={`Live operational order queue for ${placeName}.`}
        actions={
          <Button type='button' variant='outline' onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCwIcon
              className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : undefined}
              aria-hidden
            />
            {query.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      <SectionCard
        title='Operational queue'
        description='Newest orders first. This view refreshes automatically every 30 seconds.'
      >
        <div className='space-y-4'>
          <FilterBar
            activeCount={activeFilterCount}
            onReset={() => onFiltersChange({ placeId, page: 1, limit: filters.limit })}
          >
            <FilterSelect<StatusFilter>
              label='Status'
              value={filters.status ?? 'ALL'}
              options={statusOptions}
              onValueChange={(status) => update({ status: status === 'ALL' ? undefined : status })}
            />
            <FilterSelect<FulfillmentFilter>
              label='Fulfillment'
              value={filters.fulfillmentType ?? 'ALL'}
              options={fulfillmentOptions}
              onValueChange={(fulfillmentType) =>
                update({ fulfillmentType: fulfillmentType === 'ALL' ? undefined : fulfillmentType })
              }
            />
          </FilterBar>

          {query.isError && query.data && (
            <div
              role='alert'
              className='flex flex-col gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between'
            >
              <p>The latest refresh failed. The previously loaded orders remain visible.</p>
              <Button type='button' variant='outline' size='sm' onClick={() => void query.refetch()}>
                Retry refresh
              </Button>
            </div>
          )}

          {query.isPending ? (
            <LoadingState label='Loading operational orders' />
          ) : query.isError && !query.data ? (
            <ErrorState
              title={errorPresentation.title}
              description={errorPresentation.description}
              tone={getDashboardErrorTone(errorPresentation.kind)}
              onRetry={errorPresentation.canRetry ? () => void query.refetch() : undefined}
              isRetrying={query.isFetching}
            />
          ) : (query.data?.orders.length ?? 0) === 0 ? (
            <EmptyState
              icon={ShoppingBagIcon}
              title={hasFilters ? 'No orders match these filters' : 'No orders yet'}
              description={
                hasFilters
                  ? 'Clear or change the filters to see other orders for this place.'
                  : 'New orders for this place will appear here automatically.'
              }
            />
          ) : (
            <OrderQueueResults orders={query.data?.orders ?? []} onViewOrder={setSelectedOrderId} />
          )}

          {!query.isPending && query.data && (
            <Pagination
              page={filters.page}
              pageSize={filters.limit}
              totalItems={meta?.totalItems ?? 0}
              totalPages={meta?.totalPages ?? 0}
              disabled={query.isFetching}
              onPageChange={(page) => update({ page })}
              onPageSizeChange={(limit) => update({ page: 1, limit })}
            />
          )}
        </div>
      </SectionCard>
      <OrderDetailDrawer
        scope={{ kind: 'place', placeId }}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}

export {
  type FulfillmentFilter,
  fulfillmentLabel,
  fulfillmentOptions,
  OrderQueuePage,
  OrderQueueResults,
  OrderReceivedTime,
  type StatusFilter,
  statusOptions,
};
