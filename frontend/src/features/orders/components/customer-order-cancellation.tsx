import { useState } from 'react';

import { Link } from '@tanstack/react-router';
import { Loader2Icon } from 'lucide-react';

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
import { CustomerAlert } from '@/components/ui/customer-alert';
import { Label } from '@/components/ui/label';

import { getCancellationErrorPresentation } from '@/utils/customer-error-presentation';
import { cn } from '@/utils/utils';

const CANCELLATION_REASON_MAX_LENGTH = 500;
const unicodeLength = (value: string) => Array.from(value).length;

function CustomerOrderCancellation({
  orderId,
  orderCode,
  error,
  isPending,
  onClearError,
  onConfirm,
  onRefresh,
}: {
  orderId: string;
  orderCode: string;
  error?: unknown;
  isPending: boolean;
  onClearError: () => void;
  onConfirm: (reason?: string) => Promise<boolean>;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const reasonLength = unicodeLength(reason);
  const reasonInvalid = reasonLength > CANCELLATION_REASON_MAX_LENGTH;
  const errorPresentation = error ? getCancellationErrorPresentation(error) : null;

  const openDialog = () => {
    setReason('');
    onClearError();
    setOpen(true);
  };

  const submit = async () => {
    if (reasonInvalid || isPending) return;
    const succeeded = await onConfirm(reason.trim() || undefined);
    if (succeeded) {
      setOpen(false);
      setReason('');
    }
  };

  return (
    <section
      className='rounded-surface border border-destructive/25 bg-destructive/5 p-5'
      aria-labelledby='cancel-order-title'
    >
      <h2 id='cancel-order-title' className='font-semibold'>
        Cancel this order
      </h2>
      <p className='mt-1 text-sm text-muted-foreground'>
        Cancellation is available only while the order remains pending and unexpired. The server confirms eligibility.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isPending) setOpen(nextOpen);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button type='button' variant='destructive' className='mt-4' onClick={openDialog}>
            Cancel order
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (isPending) event.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {orderCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops the pending order. If its status or expiry changed, the server will reject this request and the
              latest order state will be loaded.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='space-y-2'>
            <div className='flex items-end justify-between gap-3'>
              <Label htmlFor='customer-cancellation-reason'>Reason (optional)</Label>
              <span
                className={cn('text-xs tabular-nums', reasonInvalid ? 'text-destructive' : 'text-muted-foreground')}
              >
                {reasonLength}/{CANCELLATION_REASON_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id='customer-cancellation-reason'
              rows={4}
              value={reason}
              disabled={isPending}
              aria-invalid={reasonInvalid || undefined}
              aria-describedby='customer-cancellation-reason-help'
              onChange={(event) => {
                onClearError();
                setReason(event.target.value);
              }}
              className='min-h-28 w-full resize-y rounded-md border border-input bg-form px-3 py-3 text-sm text-form-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-disabled-foreground'
              placeholder='Add context for the place'
            />
            <p
              id='customer-cancellation-reason-help'
              className={cn('text-xs', reasonInvalid ? 'text-destructive' : 'text-muted-foreground')}
              role={reasonInvalid ? 'alert' : undefined}
            >
              {reasonInvalid ? 'Keep the reason to 500 characters or fewer.' : 'A reason is not required.'}
            </p>
          </div>

          {errorPresentation && (
            <CustomerAlert
              tone={errorPresentation.tone === 'conflict' ? 'warning' : 'error'}
              title={errorPresentation.title}
              description={errorPresentation.description}
              action={
                errorPresentation.action === 'sign-in' ? (
                  <Button variant='outline' size='sm' asChild>
                    <Link to='/login' search={{ redirect: `/orders/${orderId}` }}>
                      Sign in again
                    </Link>
                  </Button>
                ) : errorPresentation.action === 'refresh' || errorPresentation.action === 'view-orders' ? (
                  <Button type='button' variant='outline' size='sm' onClick={onRefresh} disabled={isPending}>
                    Refresh order
                  </Button>
                ) : undefined
              }
              live
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel autoFocus disabled={isPending}>
              Keep order
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              disabled={isPending || reasonInvalid}
              aria-busy={isPending}
              onClick={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {isPending && <Loader2Icon className='animate-spin motion-reduce:animate-none' aria-hidden />}
              {isPending ? 'Cancelling…' : 'Cancel order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export { CANCELLATION_REASON_MAX_LENGTH, CustomerOrderCancellation };
