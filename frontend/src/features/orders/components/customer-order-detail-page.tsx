import { useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { ErrorState } from '@/components/ui/error-state';
import { LiveRegion } from '@/components/ui/live-region';
import { Skeleton } from '@/components/ui/skeleton';

import { OrderReviewActions } from '@/features/reviews/components/order-review-actions';

import { isApplicationError } from '@/utils/api-error.util';
import { getCancellationErrorPresentation, getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { formatCurrency } from '@/utils/format-currency';

import { ownOrderDetailQueryOptions } from '../queries/order-detail.query';
import { useOwnOrderCancellationMutation } from '../queries/order-transition.mutation';
import { FULFILLMENT_TYPE, ORDER_STATUS, type OrderDetail } from '../types/order.type';

import { CustomerOrderCancellation } from './customer-order-cancellation';
import { CustomerOrderStatusTimeline } from './customer-order-status-timeline';
import { OrderStatusBadge } from './order-status-badge';

const exactDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const isPendingOrderVisiblyExpired = (order: Pick<OrderDetail, 'status' | 'expiresAt'>, now = Date.now()) =>
  order.status === ORDER_STATUS.PENDING && Date.parse(order.expiresAt) <= now;

function usePendingExpiryClock(order: Pick<OrderDetail, 'status' | 'expiresAt'>) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (order.status !== ORDER_STATUS.PENDING) return;
    const remaining = Date.parse(order.expiresAt) - Date.now();
    if (remaining <= 0) return;
    const timeout = window.setTimeout(() => setNow(Date.now()), Math.min(remaining + 25, 2_147_483_647));
    return () => window.clearTimeout(timeout);
  }, [order.expiresAt, order.status]);

  return now;
}

function CustomerOrderDetailSkeleton() {
  return (
    <div
      className='mx-auto w-full max-w-5xl space-y-5 px-page py-6 sm:py-8'
      role='status'
      aria-label='Loading order details'
    >
      <Skeleton className='h-10 w-40' />
      <Skeleton className='h-60 rounded-surface' />
      <div className='grid gap-5 md:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='space-y-5'>
          <Skeleton className='h-72 rounded-surface' />
          <Skeleton className='h-64 rounded-surface' />
        </div>
        <Skeleton className='h-96 rounded-surface' />
      </div>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='space-y-1'>
      <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>{label}</dt>
      <dd className='wrap-break-word text-sm'>{children}</dd>
    </div>
  );
}

function CustomerOrderLoadError({
  error,
  orderId,
  retry,
  returnToOrders,
}: {
  error: unknown;
  orderId: string;
  retry: () => void;
  returnToOrders: () => void;
}) {
  const presentation = getCustomerErrorPresentation(error);
  const signedOut = isApplicationError(error) && error.httpStatus === 401;

  return (
    <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
      <ErrorState
        title={presentation.title}
        description={presentation.description}
        tone={presentation.tone}
        onRetry={presentation.action === 'retry' || presentation.action === 'refresh' ? retry : undefined}
        secondaryAction={
          signedOut ? (
            <Button variant='outline' asChild>
              <Link to='/login' search={{ redirect: `/orders/${orderId}` }}>
                Sign in again
              </Link>
            </Button>
          ) : (
            <Button type='button' variant='outline' onClick={returnToOrders}>
              Return to My orders
            </Button>
          )
        }
      />
    </div>
  );
}

function OrderItems({ order }: { order: OrderDetail }) {
  return (
    <section className='rounded-surface border bg-surface p-5' aria-labelledby='ordered-items-title'>
      <h2 id='ordered-items-title' className='text-lg font-semibold'>
        Ordered items
      </h2>
      <p className='mt-1 text-sm text-muted-foreground'>Names and prices are snapshots saved with this order.</p>
      <ul className='mt-4 divide-y'>
        {order.items.map((item, index) => (
          <li key={`${item.menuItemId}:${index}`} className='grid grid-cols-[1fr_auto] gap-4 py-4 first:pt-0'>
            <div className='min-w-0'>
              <p className='wrap-break-word font-medium'>{item.itemName}</p>
              <p className='mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                {item.itemType === 'FOOD' ? 'Food' : 'Drink'}
              </p>
              <p className='mt-1 text-sm text-muted-foreground'>
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
              {item.note && (
                <p className='mt-1 wrap-break-word text-sm text-muted-foreground'>Item note: {item.note}</p>
              )}
            </div>
            <p className='font-medium tabular-nums'>{formatCurrency(item.lineTotal)}</p>
          </li>
        ))}
      </ul>
      <div className='mt-4 flex items-center justify-between gap-4 border-t pt-4'>
        <span className='font-semibold'>Subtotal</span>
        <span className='text-lg font-bold tabular-nums'>{formatCurrency(order.subtotal)}</span>
      </div>
    </section>
  );
}

function OrderDetailContent({
  order,
  placed,
  placeSlug,
  refreshing,
  refreshError,
  pendingExpiryElapsed,
  cancellationError,
  cancellationPending,
  clearCancellationError,
  cancelOrder,
  refresh,
  returnToOrders,
}: {
  order: OrderDetail;
  placed: boolean;
  placeSlug?: string;
  refreshing: boolean;
  refreshError?: unknown;
  pendingExpiryElapsed: boolean;
  cancellationError?: unknown;
  cancellationPending: boolean;
  clearCancellationError: () => void;
  cancelOrder: (reason?: string) => Promise<boolean>;
  refresh: () => void;
  returnToOrders: () => void;
}) {
  const canVisiblyCancel = order.status === ORDER_STATUS.PENDING && !pendingExpiryElapsed;
  const cancellationPresentation = cancellationError ? getCancellationErrorPresentation(cancellationError) : undefined;

  return (
    <div className='mx-auto w-full max-w-5xl px-page py-6 sm:py-8'>
      {placed && (
        <CustomerAlert
          tone='success'
          title='Order received'
          description='The place will review your order next. These details come from your saved order.'
          live
          className='mb-5'
        />
      )}

      {refreshError !== undefined && refreshError !== null && (
        <CustomerAlert
          className='mb-5'
          tone='warning'
          title='Could not refresh this order'
          description='The saved information below is still visible. Refresh again before relying on its current status.'
          action={
            <Button type='button' variant='outline' size='sm' onClick={refresh} disabled={refreshing}>
              Try again
            </Button>
          }
        />
      )}

      {pendingExpiryElapsed && (
        <CustomerAlert
          className='mb-5'
          tone='warning'
          title='This pending status may be out of date'
          description='The displayed expiry time has passed. Tooang is refreshing the server status, and cancellation is unavailable meanwhile.'
          action={
            <Button type='button' variant='outline' size='sm' onClick={refresh} disabled={refreshing}>
              Refresh order
            </Button>
          }
          live
        />
      )}

      {cancellationPresentation && !canVisiblyCancel && (
        <CustomerAlert
          className='mb-5'
          tone={cancellationPresentation.tone === 'conflict' ? 'warning' : 'error'}
          title={cancellationPresentation.title}
          description={cancellationPresentation.description}
          action={
            cancellationPresentation.action === 'refresh' ? (
              <Button type='button' variant='outline' size='sm' onClick={refresh} disabled={refreshing}>
                Refresh order
              </Button>
            ) : undefined
          }
          live
        />
      )}

      <header className='rounded-surface border bg-surface p-5 shadow-sm sm:p-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-primary'>{placed ? 'Checkout complete' : 'Your order'}</p>
            <h1 className='mt-1 text-2xl font-bold tracking-tight sm:text-3xl'>{order.place.name}</h1>
            <p className='mt-3 text-sm text-muted-foreground'>Order code</p>
            <p className='select-all break-all font-mono text-xl font-bold tracking-wide sm:text-2xl'>
              {order.orderCode}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <dl className='mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3'>
          <DetailField label='Fulfillment'>
            {order.fulfillmentType === FULFILLMENT_TYPE.DINE_IN ? 'Dine in' : 'Takeaway'}
          </DetailField>
          {order.fulfillmentType === FULFILLMENT_TYPE.DINE_IN && order.diningTable && (
            <DetailField label='Table'>{order.diningTable.name}</DetailField>
          )}
          <DetailField label='Created'>
            <time dateTime={order.createdAt}>{exactDateTime(order.createdAt)}</time>
          </DetailField>
          <DetailField label={order.status === ORDER_STATUS.PENDING ? 'Expires' : 'Original expiry'}>
            <time dateTime={order.expiresAt}>{exactDateTime(order.expiresAt)}</time>
          </DetailField>
          <DetailField label='Status updated'>
            <time dateTime={order.statusUpdatedAt}>{exactDateTime(order.statusUpdatedAt)}</time>
          </DetailField>
        </dl>
        {order.status === ORDER_STATUS.PENDING && !pendingExpiryElapsed && (
          <p className='mt-4 text-sm text-muted-foreground'>
            Pending orders expire if the place does not confirm them before the time shown above.
          </p>
        )}
      </header>

      {refreshing && (
        <p className='mt-4 flex items-center gap-2 text-sm text-muted-foreground' role='status'>
          <RefreshCwIcon className='size-4 animate-spin motion-reduce:animate-none' aria-hidden /> Updating order…
        </p>
      )}

      <div className='mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='space-y-5'>
          <CustomerOrderStatusTimeline order={order} pendingExpiryElapsed={pendingExpiryElapsed} />
          <OrderItems order={order} />
        </div>

        <aside className='space-y-5'>
          <section className='rounded-surface border bg-surface p-5' aria-labelledby='customer-snapshot-title'>
            <h2 id='customer-snapshot-title' className='text-lg font-semibold'>
              Order information
            </h2>
            <dl className='mt-4 space-y-4'>
              <DetailField label='Customer'>{order.customerName}</DetailField>
              <DetailField label='Order note'>{order.customerNote || 'No order note'}</DetailField>
              {order.status === ORDER_STATUS.CANCELLED && (
                <DetailField label='Cancellation reason'>
                  {order.cancellationReason || 'No reason provided'}
                </DetailField>
              )}
            </dl>
          </section>

          {canVisiblyCancel && (
            <CustomerOrderCancellation
              orderId={order.orderId}
              orderCode={order.orderCode}
              error={cancellationError}
              isPending={cancellationPending}
              onClearError={clearCancellationError}
              onConfirm={cancelOrder}
              onRefresh={refresh}
            />
          )}

          {order.status === ORDER_STATUS.COMPLETED && <OrderReviewActions order={order} />}

          <nav className='grid gap-3 rounded-surface border bg-surface p-4' aria-label='Order next steps'>
            {placed && (
              <Button variant='outline' asChild>
                <Link
                  to='/orders/$orderId'
                  params={{ orderId: order.orderId }}
                  search={placeSlug ? { place: placeSlug } : {}}
                  replace
                >
                  View order details
                </Link>
              </Button>
            )}
            <Button type='button' variant={placed ? 'default' : 'outline'} onClick={returnToOrders}>
              My orders
            </Button>
            <Button variant='ghost' asChild>
              {placeSlug ? (
                <Link to='/places/$slug/menu' params={{ slug: placeSlug }}>
                  Return to menu
                </Link>
              ) : (
                <Link to='/'>Browse places</Link>
              )}
            </Button>
            <Button type='button' variant='ghost' onClick={refresh} disabled={refreshing}>
              <RefreshCwIcon
                className={refreshing ? 'animate-spin motion-reduce:animate-none' : undefined}
                aria-hidden
              />
              Refresh order
            </Button>
          </nav>
        </aside>
      </div>
    </div>
  );
}

export function CustomerOrderDetailPage({
  orderId,
  placed = false,
  placeSlug,
  fromCustomerOrders = false,
}: {
  orderId: string;
  placed?: boolean;
  placeSlug?: string;
  fromCustomerOrders?: boolean;
}) {
  const router = useRouter();
  const query = useQuery(ownOrderDetailQueryOptions(orderId));
  const cancellation = useOwnOrderCancellationMutation(orderId);
  const [cancellationError, setCancellationError] = useState<unknown>();
  const [announcement, setAnnouncement] = useState('');
  const expiryRefetched = useRef<string | null>(null);
  const clock = usePendingExpiryClock(query.data ?? { status: ORDER_STATUS.EXPIRED, expiresAt: '' });
  const pendingExpiryElapsed = query.data ? isPendingOrderVisiblyExpired(query.data, clock) : false;

  const returnToOrders = () => {
    if (fromCustomerOrders) {
      router.history.back();
      return;
    }
    void router.navigate({ to: '/orders' });
  };

  useEffect(() => {
    if (!query.data || !pendingExpiryElapsed || expiryRefetched.current === query.data.expiresAt) return;
    expiryRefetched.current = query.data.expiresAt;
    void query.refetch();
  }, [pendingExpiryElapsed, query]);

  if (query.isPending) return <CustomerOrderDetailSkeleton />;

  const terminalReadError =
    query.isError &&
    isApplicationError(query.error) &&
    (query.error.httpStatus === 401 || query.error.httpStatus === 403 || query.error.httpStatus === 404);
  if ((query.isError && !query.data) || terminalReadError) {
    return (
      <CustomerOrderLoadError
        error={query.error}
        orderId={orderId}
        retry={() => void query.refetch()}
        returnToOrders={returnToOrders}
      />
    );
  }
  if (!query.data) return null;

  const cancelOrder = async (reason?: string) => {
    setCancellationError(undefined);
    try {
      await cancellation.mutateAsync(reason);
      setAnnouncement('Order cancelled successfully.');
      toast.success('Order cancelled');
      return true;
    } catch (error) {
      setCancellationError(error);
      return false;
    }
  };

  return (
    <>
      <LiveRegion>{announcement}</LiveRegion>
      <OrderDetailContent
        order={query.data}
        placed={placed}
        placeSlug={placeSlug}
        refreshing={query.isFetching}
        refreshError={query.isError ? query.error : undefined}
        pendingExpiryElapsed={pendingExpiryElapsed}
        cancellationError={cancellationError}
        cancellationPending={cancellation.isPending}
        clearCancellationError={() => setCancellationError(undefined)}
        cancelOrder={cancelOrder}
        refresh={() => void query.refetch()}
        returnToOrders={returnToOrders}
      />
    </>
  );
}

export { CustomerOrderDetailSkeleton, OrderDetailContent };
