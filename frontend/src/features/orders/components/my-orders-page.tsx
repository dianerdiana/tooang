import { useMemo, useState } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCwIcon, ShoppingBagIcon } from 'lucide-react';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterBar, FilterSelect } from '@/components/ui/filter-controls';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';

import { getDashboardErrorPresentation, getDashboardErrorTone } from '@/utils/dashboard-error';

import { orderListQueryOptions } from '../queries/order-list.query';
import type { OrderQueueSearch } from '../schemas/order-list.schema';
import type { FulfillmentType, OrderStatus } from '../types/order.type';

import { OrderDetailDrawer } from './order-detail-drawer';
import {
  type FulfillmentFilter,
  fulfillmentOptions,
  OrderQueueResults,
  type StatusFilter,
  statusOptions,
} from './order-queue-page';

export function MyOrdersPage({
  filters,
  onFiltersChange,
}: {
  filters: OrderQueueSearch;
  onFiltersChange: (filters: OrderQueueSearch) => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const params = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      status: filters.status,
      fulfillmentType: filters.fulfillmentType,
    }),
    [filters],
  );
  const query = useQuery({ ...orderListQueryOptions({ kind: 'own' }, params), placeholderData: keepPreviousData });
  const error = getDashboardErrorPresentation(query.error);
  const activeCount = Number(Boolean(filters.status)) + Number(Boolean(filters.fulfillmentType));
  const update = (patch: Partial<OrderQueueSearch>) => onFiltersChange({ ...filters, ...patch, page: patch.page ?? 1 });

  return (
    <>
      <PageHeader
        title='My orders'
        description='Track your orders and review their details.'
        actions={
          <Button type='button' variant='outline' onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCwIcon className={query.isFetching ? 'animate-spin' : undefined} />
            Refresh
          </Button>
        }
      />
      <SectionCard>
        <div className='space-y-4'>
          <FilterBar activeCount={activeCount} onReset={() => onFiltersChange({ page: 1, limit: filters.limit })}>
            <FilterSelect<StatusFilter>
              label='Status'
              value={filters.status ?? 'ALL'}
              options={statusOptions}
              onValueChange={(value) => update({ status: value === 'ALL' ? undefined : (value as OrderStatus) })}
            />
            <FilterSelect<FulfillmentFilter>
              label='Fulfillment'
              value={filters.fulfillmentType ?? 'ALL'}
              options={fulfillmentOptions}
              onValueChange={(value) =>
                update({ fulfillmentType: value === 'ALL' ? undefined : (value as FulfillmentType) })
              }
            />
          </FilterBar>
          {query.isPending ? (
            <LoadingState label='Loading your orders' />
          ) : query.isError && !query.data ? (
            <ErrorState
              title={error.title}
              description={error.description}
              tone={getDashboardErrorTone(error.kind)}
              onRetry={error.canRetry ? () => void query.refetch() : undefined}
            />
          ) : !query.data?.orders.length ? (
            <EmptyState
              icon={ShoppingBagIcon}
              title={activeCount ? 'No orders match these filters' : 'No orders yet'}
              description={activeCount ? 'Try changing or clearing the filters.' : 'Orders you place will appear here.'}
            />
          ) : (
            <OrderQueueResults orders={query.data.orders} onViewOrder={setSelectedOrderId} showPlace />
          )}
          {query.data && (
            <Pagination
              page={filters.page}
              pageSize={filters.limit}
              totalItems={query.data.meta.totalItems ?? 0}
              totalPages={query.data.meta.totalPages ?? 0}
              disabled={query.isFetching}
              onPageChange={(page) => update({ page })}
              onPageSizeChange={(limit) => update({ page: 1, limit })}
            />
          )}
        </div>
      </SectionCard>
      <OrderDetailDrawer scope={{ kind: 'own' }} orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}
