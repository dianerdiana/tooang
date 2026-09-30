import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Clock3Icon, RefreshCwIcon, ShieldCheckIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LiveRegion } from '@/components/ui/live-region';
import { Skeleton } from '@/components/ui/skeleton';

import { isApplicationError } from '@/utils/api-error.util';
import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { isVerificationToken } from '@/utils/navigation/customer-route-params';

import { publicOrderVerificationQueryOptions } from '../queries/order-verification.query';
import { FULFILLMENT_TYPE, ORDER_STATUS, type OrderStatus, type PublicOrderVerification } from '../types/order.type';

import { OrderStatusBadge } from './order-status-badge';

const TERMINAL_STATUSES = new Set<OrderStatus>([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED]);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const statusMessage: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: 'This order is pending. Its status may change after the place reviews it.',
  [ORDER_STATUS.CONFIRMED]: 'This order has been confirmed and remains in progress.',
  [ORDER_STATUS.PREPARING]: 'This order is being prepared and remains in progress.',
  [ORDER_STATUS.READY]: 'This order is marked ready. This verification page does not control fulfillment.',
  [ORDER_STATUS.COMPLETED]: 'This order is marked completed.',
  [ORDER_STATUS.CANCELLED]: 'This order is marked cancelled.',
  [ORDER_STATUS.EXPIRED]: 'This order expired before confirmation.',
};

function VerificationSkeleton() {
  return (
    <div className='mx-auto w-full max-w-2xl px-page py-8 sm:py-12' role='status' aria-label='Loading verification'>
      <Skeleton className='h-5 w-36' />
      <Skeleton className='mt-3 h-10 w-64 max-w-full' />
      <div className='mt-6 rounded-surface border bg-surface p-5 sm:p-6'>
        <Skeleton className='h-7 w-28' />
        <Skeleton className='mt-5 h-20 w-full' />
        <div className='mt-6 grid gap-4 sm:grid-cols-2'>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className='h-14 w-full' />
          ))}
        </div>
      </div>
    </div>
  );
}

function VerificationNotFound() {
  return (
    <div className='mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-page py-10'>
      <ErrorState
        title='Verification unavailable'
        description='This verification link is not available. Check the link or return to discovery.'
        tone='not-found'
        secondaryAction={
          <Button variant='outline' asChild>
            <Link to='/'>Return to discovery</Link>
          </Button>
        }
      />
    </div>
  );
}

function VerificationError({ error, retry, retrying }: { error: unknown; retry: () => void; retrying: boolean }) {
  const presentation = getCustomerErrorPresentation(error);
  const rateLimited = isApplicationError(error) && error.httpStatus === 429;
  const retryAfter = rateLimited ? error.retryAfterSeconds : undefined;

  return (
    <div className='mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-page py-10'>
      <ErrorState
        title={rateLimited ? 'Too many verification attempts' : presentation.title}
        description={
          rateLimited
            ? retryAfter
              ? `Wait about ${retryAfter} seconds before trying again.`
              : 'Wait a moment before trying again.'
            : presentation.description
        }
        tone={presentation.tone}
        onRetry={retry}
        retryLabel='Try again'
        isRetrying={retrying}
        secondaryAction={
          <Button variant='ghost' asChild>
            <Link to='/'>Return to discovery</Link>
          </Button>
        }
      />
    </div>
  );
}

function VerificationDetails({
  verification,
  refreshing,
  refresh,
}: {
  verification: PublicOrderVerification;
  refreshing: boolean;
  refresh: () => void;
}) {
  const terminal = TERMINAL_STATUSES.has(verification.status);
  const fulfillment = verification.fulfillmentType === FULFILLMENT_TYPE.DINE_IN ? 'Dine in' : 'Takeaway';

  return (
    <div className='mx-auto w-full max-w-2xl px-page py-8 sm:py-12'>
      <LiveRegion>{refreshing ? 'Refreshing verification status.' : ''}</LiveRegion>
      <header>
        <p className='flex items-center gap-2 text-sm font-semibold text-primary'>
          <ShieldCheckIcon className='size-4' aria-hidden /> Public order verification
        </p>
        <h1 className='mt-2 text-2xl font-bold tracking-tight sm:text-3xl'>{verification.placeName}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>Read-only information supplied by the order service.</p>
      </header>

      <section
        className='mt-6 rounded-surface border bg-surface p-5 shadow-sm sm:p-6'
        aria-labelledby='order-code-title'
      >
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p id='order-code-title' className='text-sm font-medium text-muted-foreground'>
              Order code
            </p>
            <p className='mt-1 select-all break-all font-mono text-2xl font-bold tracking-wide sm:text-3xl'>
              {verification.orderCode}
            </p>
          </div>
          <OrderStatusBadge status={verification.status} />
        </div>

        <div className='mt-5 rounded-md border bg-muted/40 p-4' role='status' aria-label='Verification status guidance'>
          <p className='font-medium'>{statusMessage[verification.status]}</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            This page confirms the reported status only and grants no authority to change the order.
          </p>
        </div>

        <dl className='mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2'>
          <div>
            <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Fulfillment</dt>
            <dd className='mt-1 font-medium'>{fulfillment}</dd>
          </div>
          <div>
            <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Created</dt>
            <dd className='mt-1'>
              <time dateTime={verification.createdAt}>{formatDateTime(verification.createdAt)}</time>
            </dd>
          </div>
          <div>
            <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              {verification.status === ORDER_STATUS.PENDING ? 'Pending expiry' : 'Original pending expiry'}
            </dt>
            <dd className='mt-1'>
              <time dateTime={verification.expiresAt}>{formatDateTime(verification.expiresAt)}</time>
            </dd>
          </div>
          <div>
            <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Status updated</dt>
            <dd className='mt-1'>
              <time dateTime={verification.statusUpdatedAt}>{formatDateTime(verification.statusUpdatedAt)}</time>
            </dd>
          </div>
        </dl>

        {verification.status === ORDER_STATUS.PENDING && (
          <p className='mt-5 flex gap-2 border-t pt-5 text-sm text-muted-foreground'>
            <Clock3Icon className='mt-0.5 size-4 shrink-0' aria-hidden />
            Pending orders may expire at the time shown above. Refreshing requests the latest verification record.
          </p>
        )}

        {!terminal && (
          <Button
            type='button'
            variant='outline'
            className='mt-5 w-full sm:w-auto'
            disabled={refreshing}
            onClick={refresh}
          >
            <RefreshCwIcon className={refreshing ? 'animate-spin motion-reduce:animate-none' : undefined} aria-hidden />
            {refreshing ? 'Refreshing…' : 'Refresh status'}
          </Button>
        )}
      </section>
    </div>
  );
}

export function PublicOrderVerificationPage({ token }: { token: string }) {
  const tokenIsValid = isVerificationToken(token);
  const query = useQuery(publicOrderVerificationQueryOptions(token));

  if (!tokenIsValid) return <VerificationNotFound />;
  if (query.isPending) return <VerificationSkeleton />;

  const notFound = isApplicationError(query.error) && query.error.httpStatus === 404;
  if (notFound) return <VerificationNotFound />;
  if (query.isError || !query.data) {
    return <VerificationError error={query.error} retry={() => void query.refetch()} retrying={query.isFetching} />;
  }

  return (
    <VerificationDetails verification={query.data} refreshing={query.isFetching} refresh={() => void query.refetch()} />
  );
}

export { VerificationNotFound, VerificationSkeleton };
