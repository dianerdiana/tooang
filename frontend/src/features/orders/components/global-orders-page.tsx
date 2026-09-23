import { useMemo, useState } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCwIcon, ShoppingBagIcon } from 'lucide-react';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterBar, FilterSelect } from '@/components/ui/filter-controls';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { Pagination } from '@/components/ui/pagination';

import { getDashboardErrorPresentation, getDashboardErrorTone } from '@/utils/dashboard-error';

import { orderListQueryOptions } from '../queries/order-list.query';
import {
  type GlobalOrderSearch,
  isValidOrderPlaceId,
  toGlobalOrderListParams,
} from '../schemas/global-order-list.schema';

import { OrderDetailDrawer } from './order-detail-drawer';
import {
  type FulfillmentFilter,
  fulfillmentOptions,
  OrderQueueResults,
  type StatusFilter,
  statusOptions,
} from './order-queue-page';

type GlobalOrdersPageProps = {
  filters: GlobalOrderSearch;
  onFiltersChange: (filters: GlobalOrderSearch) => void;
};

function PlaceIdFilter({ value, onApply }: { value?: string; onApply: (value?: string) => void }) {
  const [draft, setDraft] = useState(value ?? '');
  const valid = isValidOrderPlaceId(draft);
  const normalized = draft.trim();

  return (
    <form
      className='grid min-w-64 flex-1 gap-1.5 sm:max-w-md'
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onApply(normalized || undefined);
      }}
    >
      <Label htmlFor='global-orders-place-id' className='text-xs text-muted-foreground'>
        Place ID
      </Label>
      <div className='flex gap-2'>
        <Input
          id='global-orders-place-id'
          value={draft}
          placeholder='Filter by exact place ID'
          aria-invalid={!valid || undefined}
          aria-describedby='global-orders-place-id-error'
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type='submit' variant='outline' disabled={!valid || (value ?? '') === normalized}>
          Apply
        </Button>
      </div>
      {!valid && (
        <p id='global-orders-place-id-error' role='alert' className='text-xs text-destructive'>
          Enter a valid place UUID.
        </p>
      )}
    </form>
  );
}

function GlobalOrdersPage({ filters, onFiltersChange }: GlobalOrdersPageProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const params = useMemo(() => toGlobalOrderListParams(filters), [filters]);
  const query = useQuery({
    ...orderListQueryOptions({ kind: 'platform' }, params),
    placeholderData: keepPreviousData,
  });
  const errorPresentation = getDashboardErrorPresentation(query.error);
  const activeFilterCount =
    Number(Boolean(filters.status)) + Number(Boolean(filters.fulfillmentType)) + Number(Boolean(filters.orderPlaceId));
  const hasFilters = activeFilterCount > 0;
  const meta = query.data?.meta;
  const update = (patch: Partial<GlobalOrderSearch>) =>
    onFiltersChange({ ...filters, ...patch, page: patch.page ?? 1 });

  return (
    <>
      <PageHeader
        title='Platform orders'
        description='Inspect globally accessible orders across Tooang places.'
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

      <SectionCard title='Global order list' description='Newest orders first across every accessible place.'>
        <div className='space-y-4'>
          <FilterBar
            activeCount={activeFilterCount}
            onReset={() => {
              onFiltersChange({ page: 1, limit: filters.limit });
            }}
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
            <PlaceIdFilter
              key={filters.orderPlaceId ?? ''}
              value={filters.orderPlaceId}
              onApply={(orderPlaceId) => update({ orderPlaceId })}
            />
          </FilterBar>

          {query.isError && query.data && (
            <div
              role='alert'
              className='flex flex-col gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between'
            >
              <p>The latest refresh failed. The previously loaded global results remain visible.</p>
              <Button type='button' variant='outline' size='sm' onClick={() => void query.refetch()}>
                Retry refresh
              </Button>
            </div>
          )}

          {query.isPending ? (
            <LoadingState label='Loading global orders' />
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
              title={hasFilters ? 'No global orders match these filters' : 'No global orders yet'}
              description={
                hasFilters
                  ? 'Clear or change the filters to inspect other orders.'
                  : 'Orders from accessible places will appear here.'
              }
            />
          ) : (
            <OrderQueueResults orders={query.data?.orders ?? []} onViewOrder={setSelectedOrderId} showPlace />
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
        scope={{ kind: 'platform' }}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}

export { GlobalOrdersPage };
