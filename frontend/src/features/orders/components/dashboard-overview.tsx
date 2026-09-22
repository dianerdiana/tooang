import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangleIcon,
  Building2Icon,
  CheckCircle2Icon,
  Clock3Icon,
  Globe2Icon,
  RefreshCwIcon,
  ShoppingBagIcon,
  UtensilsIcon,
} from 'lucide-react';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { formatCurrency } from '@/utils/format-currency';
import { formatTimeAgo } from '@/utils/format-time-ago.util';

import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

import { orderListQueryOptions } from '../queries/order-list.query';
import {
  FULFILLMENT_TYPE,
  type FulfillmentType,
  ORDER_STATUS,
  type OrderStatus,
  type OrderSummary,
} from '../types/order.type';
import { combineOrderTotals, getOrderTotal, resolveOverviewOrderScope } from '../utils/dashboard-overview';

type DashboardOverviewProps = {
  user: AuthenticatedUser;
  selectedPlace: PlaceMembership | null;
};

const statusPresentation: Record<OrderStatus, { label: string; tone: StatusBadgeTone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'primary' },
  PREPARING: { label: 'Preparing', tone: 'primary' },
  READY: { label: 'Ready', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'destructive' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
};

const fulfillmentLabels: Record<FulfillmentType, string> = {
  [FULFILLMENT_TYPE.DINE_IN]: 'Dine in',
  [FULFILLMENT_TYPE.TAKEAWAY]: 'Takeaway',
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const presentation = statusPresentation[status];
  return (
    <StatusBadge tone={presentation.tone} showDot>
      {presentation.label}
    </StatusBadge>
  );
}

function PlaceOverviewContext({ membership }: { membership: PlaceMembership }) {
  const blockers = [
    !membership.place.isPublished ? 'This place is still a draft.' : null,
    !membership.place.isOrderingEnabled ? 'Customer ordering is disabled.' : null,
  ].filter(Boolean);

  return (
    <SectionCard className='overflow-hidden' contentClassName='space-y-4'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
        <div className='flex min-w-0 items-center gap-3'>
          <span className='flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <Building2Icon className='size-5' aria-hidden />
          </span>
          <div className='min-w-0'>
            <p className='truncate font-semibold'>{membership.place.name}</p>
            <p className='text-sm text-muted-foreground'>{membership.role} membership</p>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <StatusBadge tone={membership.place.isPublished ? 'success' : 'neutral'} showDot>
            {membership.place.isPublished ? 'Published' : 'Draft'}
          </StatusBadge>
          <StatusBadge tone={membership.place.isOrderingEnabled ? 'primary' : 'neutral'} showDot>
            {membership.place.isOrderingEnabled ? 'Ordering enabled' : 'Ordering disabled'}
          </StatusBadge>
        </div>
      </div>
      {blockers.length > 0 && (
        <div className='flex items-start gap-3 rounded-lg bg-warning/15 px-4 py-3 text-sm text-warning-foreground'>
          <AlertTriangleIcon className='mt-0.5 size-4 shrink-0' aria-hidden />
          <p>{blockers.join(' ')}</p>
        </div>
      )}
    </SectionCard>
  );
}

function PlatformOverviewContext() {
  return (
    <SectionCard contentClassName='flex items-center gap-3'>
      <span className='flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
        <Globe2Icon className='size-5' aria-hidden />
      </span>
      <div>
        <p className='font-semibold'>Platform</p>
        <p className='text-sm text-muted-foreground'>Global management context for the capabilities available to you.</p>
      </div>
    </SectionCard>
  );
}

type MetricCardProps = {
  title: string;
  description: string;
  value?: number;
  isLoading: boolean;
  hasError: boolean;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

function MetricCard({ title, description, value, isLoading, hasError, icon: Icon }: MetricCardProps) {
  return (
    <SectionCard className='min-h-40' contentClassName='flex h-full items-start justify-between gap-4'>
      <div className='space-y-2'>
        <h2 className='text-sm font-medium text-muted-foreground'>{title}</h2>
        {isLoading ? (
          <Skeleton className='h-10 w-20' aria-label={`Loading ${title.toLowerCase()} count`} />
        ) : hasError || value === undefined ? (
          <p className='pt-1 text-sm font-semibold text-destructive'>Unavailable</p>
        ) : (
          <p className='text-3xl font-semibold tabular-nums'>{value.toLocaleString()}</p>
        )}
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
        <Icon className='size-5' aria-hidden />
      </span>
    </SectionCard>
  );
}

const orderContext = (order: OrderSummary) =>
  order.fulfillmentType === FULFILLMENT_TYPE.DINE_IN && order.diningTableName
    ? `Dine in · ${order.diningTableName}`
    : fulfillmentLabels[order.fulfillmentType];

function OrderTime({ createdAt }: { createdAt: string }) {
  const exactTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(createdAt),
  );

  return (
    <time dateTime={createdAt} title={exactTime} className='text-muted-foreground'>
      {formatTimeAgo(createdAt)}
    </time>
  );
}

function RecentOrdersList({ orders, isPlatform }: { orders: OrderSummary[]; isPlatform: boolean }) {
  return (
    <>
      <div className='space-y-3 md:hidden'>
        {orders.map((order) => (
          <article key={order.orderId} className='space-y-3 rounded-lg border bg-surface p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='truncate font-semibold tabular-nums'>{order.orderCode}</p>
                <p className='truncate text-sm text-muted-foreground'>{order.customerName}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
              {isPlatform && (
                <>
                  <span className='text-muted-foreground'>Place</span>
                  <span className='truncate text-right'>{order.place.name}</span>
                </>
              )}
              <span className='text-muted-foreground'>Fulfillment</span>
              <span className='truncate text-right'>{orderContext(order)}</span>
              <span className='text-muted-foreground'>Subtotal</span>
              <span className='text-right font-medium tabular-nums'>{formatCurrency(order.subtotal)}</span>
              <span className='text-muted-foreground'>Received</span>
              <span className='text-right'>
                <OrderTime createdAt={order.createdAt} />
              </span>
            </div>
          </article>
        ))}
      </div>
      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              {isPlatform && <TableHead>Place</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead className='text-right'>Subtotal</TableHead>
              <TableHead className='text-right'>Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.orderId}>
                <TableCell>
                  <span className='block font-semibold tabular-nums'>{order.orderCode}</span>
                  <span className='block max-w-52 truncate text-xs text-muted-foreground'>{order.customerName}</span>
                </TableCell>
                {isPlatform && <TableCell className='max-w-48 truncate'>{order.place.name}</TableCell>}
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>{orderContext(order)}</TableCell>
                <TableCell className='text-right font-medium tabular-nums'>{formatCurrency(order.subtotal)}</TableCell>
                <TableCell className='text-right'>
                  <OrderTime createdAt={order.createdAt} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function DashboardOverview({ user, selectedPlace }: DashboardOverviewProps) {
  const scope = useMemo(() => resolveOverviewOrderScope(user, selectedPlace), [selectedPlace, user]);
  const pending = useQuery(orderListQueryOptions(scope, { page: 1, limit: 1, status: ORDER_STATUS.PENDING }));
  const confirmed = useQuery(orderListQueryOptions(scope, { page: 1, limit: 1, status: ORDER_STATUS.CONFIRMED }));
  const preparing = useQuery(orderListQueryOptions(scope, { page: 1, limit: 1, status: ORDER_STATUS.PREPARING }));
  const ready = useQuery(orderListQueryOptions(scope, { page: 1, limit: 1, status: ORDER_STATUS.READY }));
  const recent = useQuery(orderListQueryOptions(scope, { page: 1, limit: 5 }));

  const queries = [pending, confirmed, preparing, ready, recent];
  const isRefreshing = queries.some((query) => query.isFetching && query.data !== undefined);
  const isPlatform = scope?.kind === 'platform';
  const hasPlatformContext = !selectedPlace && user.globalPermissions.length > 0;
  const confirmedPreparingTotal = combineOrderTotals(
    getOrderTotal(confirmed.data?.meta),
    getOrderTotal(preparing.data?.meta),
  );

  const refreshAll = () => {
    void Promise.all(queries.map((query) => query.refetch()));
  };

  const viewAllOrders = isPlatform ? (
    <Button asChild variant='outline' size='sm'>
      <Link to='/dashboard/platform/orders' search={{}}>
        View all orders
      </Link>
    </Button>
  ) : selectedPlace ? (
    <Button asChild variant='outline' size='sm'>
      <Link to='/dashboard/orders' search={{ placeId: selectedPlace.placeId }}>
        View all orders
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title='Overview'
        description={
          selectedPlace
            ? `Current order activity and availability for ${selectedPlace.place.name}.`
            : isPlatform
              ? 'Current order activity across the Tooang platform.'
              : hasPlatformContext
                ? 'Platform management context and operational availability for your account.'
                : 'Management context and operational availability for your account.'
        }
        actions={
          scope && (
            <Button variant='outline' onClick={refreshAll} disabled={queries.some((query) => query.isFetching)}>
              <RefreshCwIcon className={isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />
              {isRefreshing ? 'Updating…' : 'Refresh'}
            </Button>
          )
        }
      />

      {selectedPlace ? (
        <PlaceOverviewContext membership={selectedPlace} />
      ) : hasPlatformContext ? (
        <PlatformOverviewContext />
      ) : null}

      {!scope ? (
        <EmptyState
          icon={ShoppingBagIcon}
          title='Order overview unavailable'
          description='Your current management context does not include permission to read orders.'
        />
      ) : (
        <>
          <section aria-labelledby='operational-summary-title' className='space-y-4'>
            <div>
              <h2 id='operational-summary-title' className='text-section-title font-semibold'>
                Operational summary
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>Live workflow counts reported by the orders API.</p>
            </div>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              <MetricCard
                title='Pending'
                description='Orders awaiting confirmation.'
                value={getOrderTotal(pending.data?.meta)}
                isLoading={pending.isPending}
                hasError={pending.isError && !pending.data}
                icon={Clock3Icon}
              />
              <MetricCard
                title='Confirmed / preparing'
                description='Orders currently being worked on.'
                value={confirmedPreparingTotal}
                isLoading={confirmed.isPending || preparing.isPending}
                hasError={(confirmed.isError && !confirmed.data) || (preparing.isError && !preparing.data)}
                icon={UtensilsIcon}
              />
              <MetricCard
                title='Ready'
                description='Orders ready for handoff.'
                value={getOrderTotal(ready.data?.meta)}
                isLoading={ready.isPending}
                hasError={ready.isError && !ready.data}
                icon={CheckCircle2Icon}
              />
            </div>
          </section>

          <SectionCard
            title='Recent orders'
            description='The five newest orders in this management context.'
            action={viewAllOrders}
            contentClassName='min-w-0'
          >
            {recent.isPending ? (
              <div role='status' aria-label='Loading recent orders' className='space-y-3 py-2'>
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className='h-16 w-full' />
                ))}
              </div>
            ) : recent.isError && !recent.data ? (
              <ErrorState
                compact
                title='Could not load recent orders'
                description='The overview counts may still be available. Try loading this list again.'
                onRetry={() => void recent.refetch()}
                isRetrying={recent.isFetching}
              />
            ) : recent.data && recent.data.orders.length > 0 ? (
              <RecentOrdersList orders={recent.data.orders} isPlatform={isPlatform} />
            ) : (
              <EmptyState
                compact
                icon={ShoppingBagIcon}
                title='No orders yet'
                description='New orders will appear here when they are placed.'
              />
            )}
            <p className='sr-only' aria-live='polite'>
              {isRefreshing ? 'Updating order overview.' : ''}
            </p>
          </SectionCard>
        </>
      )}
    </>
  );
}

export {
  DashboardOverview,
  type DashboardOverviewProps,
  OrderStatusBadge,
  PlaceOverviewContext,
  PlatformOverviewContext,
  RecentOrdersList,
};
