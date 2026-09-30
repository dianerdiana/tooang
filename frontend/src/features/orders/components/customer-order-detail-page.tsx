import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { RefreshCwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

import { isApplicationError } from '@/utils/api-error.util';
import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { formatCurrency } from '@/utils/format-currency';

import { ownOrderDetailQueryOptions } from '../queries/order-detail.query';
import { FULFILLMENT_TYPE, ORDER_STATUS, type OrderDetail } from '../types/order.type';

import { OrderStatusBadge } from './order-status-badge';

const exactDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function CustomerOrderDetailSkeleton() {
  return (
    <div
      className='mx-auto w-full max-w-4xl space-y-5 px-page py-6 sm:py-8'
      role='status'
      aria-label='Loading order details'
    >
      <Skeleton className='h-10 w-40' />
      <Skeleton className='h-52 rounded-surface' />
      <div className='grid gap-5 md:grid-cols-2'>
        <Skeleton className='h-56 rounded-surface' />
        <Skeleton className='h-56 rounded-surface' />
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

function OrderDetailContent({
  order,
  placed,
  placeSlug,
  refreshing,
  refresh,
  returnToOrders,
}: {
  order: OrderDetail;
  placed: boolean;
  placeSlug?: string;
  refreshing: boolean;
  refresh: () => void;
  returnToOrders: () => void;
}) {
  return (
    <div className='mx-auto w-full max-w-4xl px-page py-6 sm:py-8'>
      {placed && (
        <CustomerAlert
          tone='success'
          title='Order received'
          description='The place will review your order next. These details come from your saved order.'
          live
          className='mb-5'
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
        <dl className='mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2'>
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
        {order.status === ORDER_STATUS.PENDING && (
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
      <div className='mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]'>
        <section className='rounded-surface border bg-surface p-5' aria-labelledby='ordered-items-title'>
          <h2 id='ordered-items-title' className='text-lg font-semibold'>
            Ordered items
          </h2>
          <ul className='mt-4 divide-y'>
            {order.items.map((item) => (
              <li key={item.menuItemId} className='grid grid-cols-[1fr_auto] gap-4 py-4 first:pt-0'>
                <div className='min-w-0'>
                  <p className='wrap-break-word font-medium'>{item.itemName}</p>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                  {item.note && <p className='mt-1 wrap-break-word text-sm text-muted-foreground'>Note: {item.note}</p>}
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
        <aside className='space-y-5'>
          <section className='rounded-surface border bg-surface p-5' aria-labelledby='customer-snapshot-title'>
            <h2 id='customer-snapshot-title' className='text-lg font-semibold'>
              Order information
            </h2>
            <dl className='mt-4 space-y-4'>
              <DetailField label='Customer'>{order.customerName}</DetailField>
              {order.customerNote && <DetailField label='Order note'>{order.customerNote}</DetailField>}
            </dl>
          </section>
          <nav className='grid gap-3' aria-label='Order next steps'>
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
              />{' '}
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
  const returnToOrders = () => {
    if (fromCustomerOrders) {
      router.history.back();
      return;
    }
    void router.navigate({ to: '/orders' });
  };
  if (query.isPending) return <CustomerOrderDetailSkeleton />;
  if (query.isError && !query.data) {
    const presentation = getCustomerErrorPresentation(query.error);
    const signedOut = isApplicationError(query.error) && query.error.httpStatus === 401;
    return (
      <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
        <ErrorState
          title={presentation.title}
          description={presentation.description}
          tone={presentation.tone}
          onRetry={
            presentation.action === 'retry' || presentation.action === 'refresh'
              ? () => void query.refetch()
              : undefined
          }
          secondaryAction={
            <Button variant='outline' asChild>
              {signedOut ? (
                <Link to='/login' search={{ redirect: `/orders/${orderId}` }}>
                  Sign in again
                </Link>
              ) : (
                <button type='button' onClick={returnToOrders}>
                  Return to My orders
                </button>
              )}
            </Button>
          }
        />
      </div>
    );
  }
  if (!query.data) return null;
  return (
    <OrderDetailContent
      order={query.data}
      placed={placed}
      placeSlug={placeSlug}
      refreshing={query.isFetching}
      refresh={() => void query.refetch()}
      returnToOrders={returnToOrders}
    />
  );
}
