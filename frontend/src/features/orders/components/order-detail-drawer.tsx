import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';

import { isApplicationError } from '@/utils/api-error.util';
import { canAtPlace } from '@/utils/auth/has-permission';
import { getDashboardErrorPresentation, getDashboardErrorTone, getSafeMutationError } from '@/utils/dashboard-error';
import { formatCurrency } from '@/utils/format-currency';
import { useAppAbility } from '@/utils/hooks/use-app-ability';
import { cn } from '@/utils/utils';

import { PERMISSION } from '@/types/permission.type';

import { orderDetailQueryOptions } from '../queries/order-detail.query';
import { useScopedOrderTransitionMutation } from '../queries/order-transition.mutation';
import {
  FULFILLMENT_TYPE,
  type OperationalOrderStatusInput,
  type OperationalOrderTransitionTarget,
  ORDER_STATUS,
  type OrderDetail,
  type OrderDetailScope,
  type OrderStatus,
} from '../types/order.type';

import { OrderStatusBadge, orderStatusPresentation } from './order-status-badge';

type OrderTransitionPermissions = {
  canConfirm: boolean;
  canPrepare: boolean;
  canMarkReady: boolean;
  canComplete: boolean;
  canCancel: boolean;
};

type TransitionAction = {
  target: OperationalOrderTransitionTarget;
  label: string;
  description: string;
  destructive?: boolean;
};

const forwardTransition: Partial<Record<OrderStatus, TransitionAction>> = {
  [ORDER_STATUS.PENDING]: {
    target: ORDER_STATUS.CONFIRMED,
    label: 'Confirm order',
    description: 'Confirm that this order has been accepted.',
  },
  [ORDER_STATUS.CONFIRMED]: {
    target: ORDER_STATUS.PREPARING,
    label: 'Start preparing',
    description: 'Mark this order as being prepared.',
  },
  [ORDER_STATUS.PREPARING]: {
    target: ORDER_STATUS.READY,
    label: 'Mark ready',
    description: 'Mark this order as ready for handoff.',
  },
  [ORDER_STATUS.READY]: {
    target: ORDER_STATUS.COMPLETED,
    label: 'Complete order',
    description: 'Confirm that this order has been handed off.',
  },
};

const permissionForTarget: Record<OperationalOrderTransitionTarget, keyof OrderTransitionPermissions> = {
  [ORDER_STATUS.CONFIRMED]: 'canConfirm',
  [ORDER_STATUS.PREPARING]: 'canPrepare',
  [ORDER_STATUS.READY]: 'canMarkReady',
  [ORDER_STATUS.COMPLETED]: 'canComplete',
  [ORDER_STATUS.CANCELLED]: 'canCancel',
};

const cancellableStatuses = new Set<OrderStatus>([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
]);

const terminalStatuses = new Set<OrderStatus>([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED]);

export const getCancellationReasonState = (status: OrderStatus, reason: string) => {
  const required = status !== ORDER_STATUS.PENDING;
  const normalized = reason.normalize('NFC').trim().replace(/\r\n?/gu, '\n');
  const length = Array.from(normalized).length;
  return { required, normalized, length, invalid: length > 500 || (required && length === 0) };
};

export const resolveAvailableTransitions = (
  status: OrderStatus,
  permissions: OrderTransitionPermissions,
): TransitionAction[] => {
  const actions: TransitionAction[] = [];
  const forward = forwardTransition[status];
  if (forward && permissions[permissionForTarget[forward.target]]) actions.push(forward);
  if (cancellableStatuses.has(status) && permissions.canCancel) {
    actions.push({
      target: ORDER_STATUS.CANCELLED,
      label: 'Cancel order',
      description: 'Cancel this order and stop its operational lifecycle.',
      destructive: true,
    });
  }
  return actions;
};

const exactDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='space-y-1'>
      <dt className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>{label}</dt>
      <dd className='text-sm'>{children}</dd>
    </div>
  );
}

function Timestamp({ label, value }: { label: string; value: string }) {
  return (
    <li className='flex items-start justify-between gap-4 border-l-2 border-primary/30 pl-3 text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <time dateTime={value} className='text-right tabular-nums'>
        {exactDateTime(value)}
      </time>
    </li>
  );
}

function OrderDetailView({ order }: { order: OrderDetail }) {
  const isTerminal = terminalStatuses.has(order.status);
  const timestamps = [
    { label: 'Created', value: order.createdAt },
    ...(order.confirmedAt ? [{ label: 'Confirmed', value: order.confirmedAt }] : []),
    { label: 'Status last changed', value: order.statusUpdatedAt },
    ...(order.completedAt ? [{ label: 'Completed', value: order.completedAt }] : []),
    ...(order.cancelledAt ? [{ label: 'Cancelled', value: order.cancelledAt }] : []),
  ];

  return (
    <div className='space-y-6'>
      <section className={cn('rounded-lg border p-4', orderStatusPresentation[order.status].attentionClassName)}>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <p className='font-semibold tabular-nums'>{order.orderCode}</p>
            <p className='text-sm text-muted-foreground'>{order.place.name}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className='mt-3 text-sm font-medium'>{isTerminal ? 'Terminal order' : 'Active order'}</p>
        <p className='text-xs text-muted-foreground'>
          {isTerminal ? 'No further forward lifecycle steps are available.' : 'This order is still in progress.'}
        </p>
      </section>

      <section aria-labelledby='order-context-title' className='space-y-3'>
        <h3 id='order-context-title'>Order information</h3>
        <dl className='grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4'>
          <DetailField label='Customer'>{order.customerName}</DetailField>
          <DetailField label='Fulfillment'>
            {order.fulfillmentType === FULFILLMENT_TYPE.DINE_IN ? 'Dine in' : 'Takeaway'}
          </DetailField>
          {order.fulfillmentType === FULFILLMENT_TYPE.DINE_IN && order.diningTable && (
            <DetailField label='Dining table'>{order.diningTable.name}</DetailField>
          )}
          <DetailField label='Subtotal'>
            <span className='font-semibold tabular-nums'>{formatCurrency(order.subtotal)}</span>
          </DetailField>
        </dl>
        {order.customerNote && (
          <div className='rounded-lg border p-4'>
            <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Customer note</p>
            <p className='mt-2 whitespace-pre-wrap text-sm'>{order.customerNote}</p>
          </div>
        )}
        {order.cancellationReason && (
          <div className='rounded-lg border border-destructive/25 bg-destructive/10 p-4'>
            <p className='text-xs font-medium uppercase tracking-wide text-destructive'>Cancellation reason</p>
            <p className='mt-2 whitespace-pre-wrap text-sm'>{order.cancellationReason}</p>
          </div>
        )}
      </section>

      <section aria-labelledby='order-items-title' className='space-y-3'>
        <h3 id='order-items-title'>Items</h3>
        <div className='divide-y rounded-lg border'>
          {order.items.map((item, index) => (
            <article key={`${item.menuItemId}:${index}`} className='space-y-2 p-4'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='font-medium'>{item.itemName}</p>
                  <p className='text-xs text-muted-foreground'>{item.itemType === 'FOOD' ? 'Food' : 'Drink'}</p>
                </div>
                <p className='font-semibold tabular-nums'>{formatCurrency(item.lineTotal)}</p>
              </div>
              <p className='text-sm text-muted-foreground'>
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
              {item.note && <p className='whitespace-pre-wrap text-sm'>Note: {item.note}</p>}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby='order-timeline-title' className='space-y-3'>
        <h3 id='order-timeline-title'>Timeline</h3>
        <ul className='space-y-3'>
          {timestamps.map((timestamp) => (
            <Timestamp key={`${timestamp.label}:${timestamp.value}`} {...timestamp} />
          ))}
          {order.status === ORDER_STATUS.PENDING && <Timestamp label='Expires' value={order.expiresAt} />}
        </ul>
      </section>
    </div>
  );
}

function CancellationDialog({
  order,
  pending,
  onConfirm,
}: {
  order: OrderDetail;
  pending: boolean;
  onConfirm: (input: OperationalOrderStatusInput) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const reasonState = getCancellationReasonState(order.status, reason);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setReason('');
          setSubmissionFailed(false);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type='button' variant='destructive' disabled={pending}>
          <XCircleIcon aria-hidden /> Cancel order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {order.orderCode}?</AlertDialogTitle>
          <AlertDialogDescription>
            This terminates the order lifecycle. The backend will verify that cancellation is still allowed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className='space-y-2'>
          <Label htmlFor='order-cancellation-reason'>
            Cancellation reason {reasonState.required ? '(required)' : '(optional)'}
          </Label>
          <textarea
            id='order-cancellation-reason'
            rows={4}
            value={reason}
            aria-invalid={reasonState.invalid || undefined}
            aria-describedby='order-cancellation-help'
            className='w-full resize-y rounded-md border bg-form px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
            onChange={(event) => {
              setSubmissionFailed(false);
              setReason(event.target.value);
            }}
          />
          <p
            id='order-cancellation-help'
            className={cn('text-xs text-muted-foreground', reasonState.invalid && 'text-destructive')}
          >
            {reasonState.required && reasonState.length === 0
              ? 'A reason is required after the pending state.'
              : `${reasonState.length}/500 characters`}
          </p>
          {submissionFailed && (
            <p role='alert' className='text-sm text-destructive'>
              The order could not be cancelled. Review the reason or close this dialog to see the latest order state.
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep order</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={reasonState.invalid || pending}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm({
                status: ORDER_STATUS.CANCELLED,
                ...(reasonState.normalized ? { cancellationReason: reasonState.normalized } : {}),
              }).then((succeeded) => {
                if (succeeded) setOpen(false);
                else setSubmissionFailed(true);
              });
            }}
          >
            {pending && <Loader2Icon className='animate-spin' aria-hidden />}
            {pending ? 'Cancelling…' : 'Cancel order'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function OrderActions({
  order,
  permissions,
  pending,
  onTransition,
}: {
  order: OrderDetail;
  permissions: OrderTransitionPermissions;
  pending: boolean;
  onTransition: (input: OperationalOrderStatusInput) => Promise<boolean>;
}) {
  const actions = resolveAvailableTransitions(order.status, permissions);
  if (actions.length === 0) {
    return (
      <section className='rounded-lg border bg-muted/40 p-4' aria-label='Order actions'>
        <p className='text-sm font-medium'>No actions available</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          {terminalStatuses.has(order.status)
            ? 'This order is in a terminal state.'
            : 'Your current permissions do not allow a transition from this state.'}
        </p>
      </section>
    );
  }

  const forward = actions.find((action) => !action.destructive);
  const cancellation = actions.find((action) => action.destructive);

  return (
    <section className='space-y-3 border-t pt-5' aria-label='Order actions'>
      <h3>Actions</h3>
      <div className='flex flex-wrap gap-2'>
        {forward && (
          <ConfirmDialog
            title={`${forward.label}?`}
            description={`${forward.description} The backend will verify the current order state.`}
            confirmLabel={forward.label}
            isPending={pending}
            onConfirm={() =>
              void onTransition({ status: forward.target as Exclude<typeof forward.target, 'CANCELLED'> })
            }
            trigger={
              <Button type='button' disabled={pending}>
                <CheckCircle2Icon aria-hidden /> {forward.label}
              </Button>
            }
          />
        )}
        {cancellation && <CancellationDialog order={order} pending={pending} onConfirm={onTransition} />}
      </div>
    </section>
  );
}

function detailError(error: unknown) {
  return getSafeMutationError(error, 'Could not update this order. Please try again.');
}

function OrderDetailContent({ scope, orderId }: { scope: OrderDetailScope; orderId: string }) {
  const ability = useAppAbility();
  const query = useQuery(orderDetailQueryOptions(scope, orderId));
  const transitionPlaceId = scope.kind === 'place' ? scope.placeId : (query.data?.place.placeId ?? '');
  const mutation = useScopedOrderTransitionMutation(scope, transitionPlaceId, orderId);
  const [notice, setNotice] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  if (query.isPending) return <LoadingState label='Loading order details' compact />;
  if ((query.isError && !query.data) || !query.data) {
    const errorPresentation = getDashboardErrorPresentation(query.error);
    return (
      <ErrorState
        title={errorPresentation.title}
        description={errorPresentation.description}
        tone={getDashboardErrorTone(errorPresentation.kind)}
        onRetry={errorPresentation.canRetry ? () => void query.refetch() : undefined}
        isRetrying={query.isFetching}
      />
    );
  }

  const permissions: OrderTransitionPermissions =
    scope.kind === 'own'
      ? {
          canConfirm: false,
          canPrepare: false,
          canMarkReady: false,
          canComplete: false,
          canCancel: query.data.status === ORDER_STATUS.PENDING,
        }
      : {
          canConfirm: canAtPlace(ability, transitionPlaceId, PERMISSION.ORDER_CONFIRM),
          canPrepare: canAtPlace(ability, transitionPlaceId, PERMISSION.ORDER_PREPARE),
          canMarkReady: canAtPlace(ability, transitionPlaceId, PERMISSION.ORDER_READY),
          canComplete: canAtPlace(ability, transitionPlaceId, PERMISSION.ORDER_COMPLETE),
          canCancel: canAtPlace(ability, transitionPlaceId, PERMISSION.ORDER_CANCEL),
        };

  const transition = async (input: OperationalOrderStatusInput) => {
    setNotice(undefined);
    setActionError(undefined);
    try {
      const updated = await mutation.mutateAsync(input);
      toast.success(`${updated.orderCode} is now ${orderStatusPresentation[updated.status].label.toLowerCase()}.`);
      return true;
    } catch (error) {
      if (input.status === ORDER_STATUS.CANCELLED) {
        toast.error(getSafeMutationError(error, 'Unable to cancel this order. Please try again.'));
      }
      if (isApplicationError(error) && error.httpStatus === 409) {
        await query.refetch();
        setNotice('The order changed before this action completed. Its latest state and actions are now shown.');
        return true;
      } else if (isApplicationError(error) && error.code === 'CANCELLATION_REASON_REQUIRED') {
        setActionError('A cancellation reason is required for the current order state.');
      } else {
        setActionError(detailError(error));
      }
      return false;
    }
  };

  return (
    <div className='space-y-6'>
      {notice && (
        <div role='status' className='rounded-lg border border-warning/30 bg-warning/15 p-3 text-sm'>
          {notice}
        </div>
      )}
      {actionError && (
        <div role='alert' className='rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm'>
          {actionError}
        </div>
      )}
      <OrderDetailView order={query.data} />
      <OrderActions
        order={query.data}
        permissions={permissions}
        pending={mutation.isPending}
        onTransition={transition}
      />
    </div>
  );
}

function OrderDetailDrawer({
  scope,
  orderId,
  onClose,
}: {
  scope: OrderDetailScope;
  orderId: string | null;
  onClose: () => void;
}) {
  return (
    <ResponsiveDrawer
      open={orderId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      side='right'
      title='Order details'
      description='Authenticated operational data and available lifecycle actions.'
      contentClassName='sm:max-w-xl'
    >
      {orderId && (
        <OrderDetailContent
          key={`${scope.kind}:${scope.kind === 'place' ? scope.placeId : scope.kind}:${orderId}`}
          scope={scope}
          orderId={orderId}
        />
      )}
    </ResponsiveDrawer>
  );
}

export {
  CancellationDialog,
  OrderActions,
  OrderDetailContent,
  OrderDetailDrawer,
  OrderDetailView,
  type OrderTransitionPermissions,
};
