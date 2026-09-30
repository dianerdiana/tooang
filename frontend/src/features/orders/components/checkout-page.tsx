import { useEffect, useRef, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, Loader2Icon, RefreshCwIcon, ShoppingBagIcon, UtensilsIcon } from 'lucide-react';

import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { PlaceOpenStateBadge, PlaceOrderingStateBadge } from '@/components/ui/customer-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StickyMobileActionBar } from '@/components/ui/sticky-mobile-action-bar';

import { cartQueryOptions } from '@/features/cart/queries/cart.query';
import type { Cart } from '@/features/cart/types/cart.type';
import { publicPlaceQueryOptions } from '@/features/places/queries/places.query';
import type { PublicPlaceDetail } from '@/features/places/types/places.type';

import { isApplicationError } from '@/utils/api-error.util';
import { getCheckoutErrorPresentation } from '@/utils/customer-error-presentation';
import { formatCurrency } from '@/utils/format-currency';
import { useAuth } from '@/utils/hooks/use-auth';

import { useCheckoutMutation } from '../queries/checkout.mutation';
import { ownOrderListQueryOptions } from '../queries/order-list.query';
import {
  CHECKOUT_CUSTOMER_NAME_MAX_LENGTH,
  CHECKOUT_CUSTOMER_NOTE_MAX_LENGTH,
  checkoutCustomerNameSchema,
  checkoutFormNoteSchema,
  checkoutFormSchema,
  checkoutInputSchema,
} from '../schemas/checkout.schema';
import type { CheckoutInput, OrderSummary } from '../types/order.type';
import {
  canonicalizeCheckoutInput,
  CHECKOUT_ATTEMPT_STATE,
  type CheckoutAttempt,
  clearCheckoutAttempt,
  createOrReuseCheckoutAttempt,
  markCheckoutRecoveryChecked,
  readCheckoutAttempt,
  transitionCheckoutAttempt,
} from '../utils/checkout-attempt';

const firstErrorMessage = (errors: unknown[]) => {
  const error = errors[0];
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};

const unicodeLength = (value: string) => Array.from(value).length;

function CheckoutSkeleton() {
  return (
    <div
      className='mx-auto w-full max-w-6xl space-y-6 px-page py-6 sm:py-8'
      role='status'
      aria-label='Loading checkout'
    >
      <Skeleton className='h-11 w-36' />
      <div className='space-y-2'>
        <Skeleton className='h-9 w-2/3 max-w-md' />
        <Skeleton className='h-5 w-48' />
      </div>
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <div className='space-y-4'>
          <Skeleton className='h-40 rounded-surface' />
          <Skeleton className='h-64 rounded-surface' />
        </div>
        <Skeleton className='hidden h-80 rounded-surface lg:block' />
      </div>
    </div>
  );
}

function CheckoutLoadError({ error, retry }: { error: unknown; retry: () => void }) {
  const presentation = getCheckoutErrorPresentation(error);
  return (
    <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
      <ErrorState
        title={presentation.title}
        description={presentation.description}
        tone={presentation.tone}
        onRetry={presentation.action === 'retry' || presentation.action === 'refresh' ? retry : undefined}
      />
    </div>
  );
}

function OrderReview({ cart }: { cart: Cart }) {
  return (
    <section className='rounded-surface border bg-surface p-4 sm:p-5' aria-labelledby='checkout-review-title'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 id='checkout-review-title' className='text-lg font-semibold'>
            Review your items
          </h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Prices and eligibility are confirmed again by the server.
          </p>
        </div>
        <span className='shrink-0 text-sm font-medium tabular-nums'>
          {cart.aggregateQuantity} {cart.aggregateQuantity === 1 ? 'item' : 'items'}
        </span>
      </div>
      <ul className='mt-4 divide-y' aria-label='Items being ordered'>
        {cart.items.map((item) => (
          <li key={item.menuItemId} className='grid grid-cols-[1fr_auto] gap-3 py-4 first:pt-0 last:pb-0'>
            <div className='min-w-0'>
              <p className='wrap-break-word font-medium'>{item.name}</p>
              <p className='mt-1 text-sm text-muted-foreground'>Quantity {item.quantity}</p>
              {item.note && (
                <p className='mt-1 wrap-break-word text-sm text-muted-foreground'>Item note: {item.note}</p>
              )}
            </div>
            <p className='text-sm font-medium tabular-nums'>{formatCurrency(item.unitPrice)} each</p>
          </li>
        ))}
      </ul>
      <p className='mt-4 border-t pt-4 text-sm text-muted-foreground'>
        The cart API does not provide an authoritative subtotal. Your final subtotal is confirmed only after the order
        is placed.
      </p>
    </section>
  );
}

function ResolvedCheckoutPage({ place }: { place: PublicPlaceDetail }) {
  const { user } = useAuth();
  const cartQuery = useQuery(cartQueryOptions(place.id));

  if (cartQuery.isPending) return <CheckoutSkeleton />;
  if (cartQuery.isError && !cartQuery.data) {
    return <CheckoutLoadError error={cartQuery.error} retry={() => void cartQuery.refetch()} />;
  }
  if (!cartQuery.data) return null;
  if (!user) return null;

  return (
    <CheckoutForm
      place={place}
      cart={cartQuery.data}
      refetchCart={() => void cartQuery.refetch()}
      defaultName={user.fullName}
      userId={user.userId}
    />
  );
}

function CheckoutForm({
  place,
  cart,
  refetchCart,
  defaultName,
  userId,
}: {
  place: PublicPlaceDetail;
  cart: Cart;
  refetchCart: () => void;
  defaultName: string;
  userId: string;
}) {
  const mutation = useCheckoutMutation(place.id, place.slug);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const restoredFormRef = useRef(false);
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>();
  const [submissionError, setSubmissionError] = useState<unknown>();
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [historyError, setHistoryError] = useState<unknown>();
  const [checkingHistory, setCheckingHistory] = useState(false);

  const runAttempt = async (current: CheckoutAttempt) => {
    if (current.expiresAt <= Date.now()) {
      clearCheckoutAttempt({ userId, placeId: place.id });
      setAttempt({ ...current, state: CHECKOUT_ATTEMPT_STATE.BLOCKED });
      setSubmissionError({
        error: true,
        message: 'This checkout attempt has expired',
        code: 'CHECKOUT_ATTEMPT_EXPIRED',
        isNetworkError: false,
      });
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    const submitting = transitionCheckoutAttempt(current, CHECKOUT_ATTEMPT_STATE.SUBMITTING);
    setAttempt(submitting);
    setSubmissionError(undefined);
    try {
      const order = await mutation.mutateAsync({
        input: submitting.input,
        attempt: {
          idempotencyKey: submitting.idempotencyKey,
          fingerprint: submitting.fingerprint,
        },
      });
      clearCheckoutAttempt({ userId, placeId: place.id });
      setAttempt(null);
      await navigate({
        to: '/orders/$orderId',
        params: { orderId: order.orderId },
        search: { placed: true, place: place.slug },
        replace: true,
      });
    } catch (error) {
      const nextState =
        isApplicationError(error) && error.isNetworkError
          ? CHECKOUT_ATTEMPT_STATE.UNCERTAIN
          : isApplicationError(error) && error.code === 'IDEMPOTENCY_KEY_REUSED'
            ? CHECKOUT_ATTEMPT_STATE.BLOCKED
            : CHECKOUT_ATTEMPT_STATE.READY;
      setAttempt(transitionCheckoutAttempt(submitting, nextState));
      setSubmissionError(error);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    }
  };

  const form = useForm({
    defaultValues: { customerName: defaultName, customerNote: '' },
    validators: { onSubmit: checkoutFormSchema },
    onSubmit: async ({ value }) => {
      setSubmissionError(undefined);
      const input = checkoutInputSchema.parse({
        placeId: place.id,
        fulfillmentType: 'TAKEAWAY',
        customerName: value.customerName,
        customerNote: value.customerNote,
      }) as CheckoutInput;
      try {
        if (attempt) {
          if (canonicalizeCheckoutInput(input) !== canonicalizeCheckoutInput(attempt.input)) return;
          await runAttempt(attempt);
          return;
        }
        const result = await createOrReuseCheckoutAttempt({ userId, input });
        setAttempt(result.attempt);
        if (result.status === 'payload-mismatch') return;
        await runAttempt(result.attempt);
      } catch (error) {
        setSubmissionError(error);
        window.requestAnimationFrame(() => errorRef.current?.focus());
      }
    },
  });

  useEffect(() => {
    let active = true;
    void readCheckoutAttempt({ userId, placeId: place.id }).then((restored) => {
      if (!active) return;
      setAttempt(restored);
    });
    return () => {
      active = false;
    };
  }, [form, place.id, userId]);

  useEffect(() => {
    if (attempt === undefined || restoredFormRef.current) return;
    restoredFormRef.current = true;
    if (!attempt) return;
    form.reset({
      customerName: attempt.input.customerName,
      customerNote: attempt.input.customerNote ?? '',
    });
  }, [attempt, form]);

  if (attempt === undefined) return <CheckoutSkeleton />;

  const currentInput = checkoutInputSchema.safeParse({
    placeId: place.id,
    fulfillmentType: 'TAKEAWAY',
    customerName: form.state.values.customerName,
    customerNote: form.state.values.customerNote,
  });
  const detailsChanged = Boolean(
    attempt &&
    currentInput.success &&
    canonicalizeCheckoutInput(currentInput.data) !== canonicalizeCheckoutInput(attempt.input),
  );
  const uncertain =
    attempt?.state === CHECKOUT_ATTEMPT_STATE.UNCERTAIN || attempt?.state === CHECKOUT_ATTEMPT_STATE.SUBMITTING;
  const blocked = attempt?.state === CHECKOUT_ATTEMPT_STATE.BLOCKED;

  const abandonAttempt = () => {
    clearCheckoutAttempt({ userId, placeId: place.id });
    setAttempt(null);
    setSubmissionError(undefined);
    setHistoryError(undefined);
    setRecentOrders([]);
    mutation.reset();
  };

  const checkRecentOrders = async () => {
    if (!attempt) return;
    setCheckingHistory(true);
    setHistoryError(undefined);
    try {
      const query = ownOrderListQueryOptions({ page: 1, limit: 5, placeId: attempt.placeId });
      const result = await queryClient.fetchQuery({ ...query, staleTime: 0 });
      setRecentOrders(result.orders);
      const checked = markCheckoutRecoveryChecked(attempt);
      setAttempt(checked);
    } catch (error) {
      setHistoryError(error);
    } finally {
      setCheckingHistory(false);
    }
  };

  if (cart.items.length === 0 && !uncertain && !blocked) {
    return (
      <div className='mx-auto w-full max-w-3xl px-page py-8'>
        <EmptyState
          icon={ShoppingBagIcon}
          title='Your cart is empty'
          description='Add an available item before starting checkout.'
          action={
            <Button asChild>
              <Link to='/places/$slug/menu' params={{ slug: place.slug }}>
                Browse menu
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const presentation = submissionError && !uncertain ? getCheckoutErrorPresentation(submissionError) : null;
  const historyPresentation = historyError ? getCheckoutErrorPresentation(historyError) : null;
  const knownAvailabilityBlocker = !place.isOpen || !place.isOrderingEnabled;

  const recoveryAction = presentation ? (
    presentation.action === 'view-orders' ? (
      <Button asChild size='sm'>
        <Link to='/orders'>Check My orders</Link>
      </Button>
    ) : presentation.action === 'review-cart' ? (
      <Button asChild size='sm' variant='outline'>
        <Link to='/places/$slug/cart' params={{ slug: place.slug }}>
          Review cart
        </Link>
      </Button>
    ) : presentation.action === 'return-to-menu' ? (
      <Button asChild size='sm' variant='outline'>
        <Link to='/places/$slug/menu' params={{ slug: place.slug }}>
          Browse menu
        </Link>
      </Button>
    ) : presentation.action === 'discover' ? (
      <Button asChild size='sm' variant='outline'>
        <Link to='/'>Return to discovery</Link>
      </Button>
    ) : presentation.action === 'refresh' || presentation.action === 'retry' ? (
      <Button type='button' size='sm' variant='outline' onClick={refetchCart}>
        <RefreshCwIcon aria-hidden /> Refresh checkout
      </Button>
    ) : undefined
  ) : undefined;

  const submitButton = (mobile = false) => (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          type='submit'
          size='lg'
          className={mobile ? 'min-h-12 shrink-0' : 'w-full'}
          disabled={
            !canSubmit ||
            isSubmitting ||
            mutation.isPending ||
            knownAvailabilityBlocker ||
            uncertain ||
            blocked ||
            detailsChanged
          }
        >
          {isSubmitting || mutation.isPending ? (
            <>
              <Loader2Icon className='animate-spin motion-reduce:animate-none' aria-hidden /> Placing order…
            </>
          ) : (
            'Place takeaway order'
          )}
        </Button>
      )}
    </form.Subscribe>
  );

  return (
    <div className='mx-auto w-full max-w-6xl px-page py-6 sm:py-8'>
      <header className='space-y-4'>
        <Button variant='ghost' asChild className='-ml-3 min-h-11'>
          <Link to='/places/$slug/cart' params={{ slug: place.slug }}>
            <ArrowLeftIcon aria-hidden /> Back to cart
          </Link>
        </Button>
        <div>
          <p className='text-sm font-semibold text-primary'>Checkout at</p>
          <h1 className='mt-1 wrap-break-word text-3xl font-bold tracking-tight'>{place.name}</h1>
          <p className='mt-1 text-muted-foreground'>Add your details, review the current cart, then place the order.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <PlaceOpenStateBadge state={place.isOpen ? 'OPEN' : 'CLOSED'} />
          <PlaceOrderingStateBadge enabled={place.isOrderingEnabled} />
        </div>
      </header>

      <form
        ref={formRef}
        className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'
        noValidate
        aria-busy={mutation.isPending || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (mutation.isPending || form.state.isSubmitting || uncertain || blocked || detailsChanged) return;
          const valid = checkoutFormSchema.safeParse(form.state.values).success;
          void form.handleSubmit().then(() => {
            if (!valid) {
              window.requestAnimationFrame(() =>
                formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
              );
            }
          });
        }}
      >
        <div className='space-y-5'>
          {cart.removedItems.length > 0 && (
            <CustomerAlert
              tone='warning'
              title='Your cart was updated'
              description='Unavailable items were removed. Review the current items before placing the order.'
            />
          )}
          {!place.isOpen && (
            <CustomerAlert
              tone='warning'
              title='This place is closed'
              description='Checkout is unavailable until the place is open. The server will confirm current hours again.'
            />
          )}
          {!place.isOrderingEnabled && (
            <CustomerAlert
              tone='warning'
              title='Online ordering is unavailable'
              description='This place is not accepting customer orders right now.'
            />
          )}
          {uncertain && attempt && (
            <section className='space-y-4' aria-labelledby='checkout-recovery-title'>
              <CustomerAlert
                ref={errorRef}
                tabIndex={-1}
                tone='warning'
                title='Check whether your order was received'
                description='The connection ended before we could confirm the result. Your order may still have been placed, so check your recent orders before trying these same details again.'
                live
              />
              <div className='rounded-surface border bg-surface p-4 sm:p-5'>
                <h2 id='checkout-recovery-title' className='font-semibold'>
                  Recover this checkout safely
                </h2>
                <p className='mt-1 text-sm text-muted-foreground'>
                  We kept only the request details needed to retry this checkout in this browser tab.
                </p>
                <div className='mt-4 flex flex-wrap gap-3'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void checkRecentOrders()}
                    disabled={checkingHistory}
                  >
                    {checkingHistory ? (
                      <Loader2Icon className='animate-spin motion-reduce:animate-none' aria-hidden />
                    ) : (
                      <RefreshCwIcon aria-hidden />
                    )}
                    Check recent orders
                  </Button>
                  <Button
                    type='button'
                    onClick={() => void runAttempt(attempt)}
                    disabled={!attempt.recoveryCheckedAt || mutation.isPending}
                  >
                    Retry the same order details
                  </Button>
                  {attempt.recoveryCheckedAt && (
                    <Button type='button' variant='ghost' onClick={abandonAttempt} disabled={mutation.isPending}>
                      Abandon and start a new attempt
                    </Button>
                  )}
                </div>
                {!attempt.recoveryCheckedAt && (
                  <p className='mt-3 text-sm text-muted-foreground'>
                    The retry action unlocks after recent orders have been refreshed successfully.
                  </p>
                )}
                {historyPresentation && (
                  <CustomerAlert
                    className='mt-4'
                    tone='error'
                    title={historyPresentation.title}
                    description={historyPresentation.description}
                  />
                )}
                {attempt.recoveryCheckedAt && !historyError && (
                  <div className='mt-5 border-t pt-4'>
                    <h3 className='font-medium'>Recent orders from this place</h3>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      These are possible matches only. Open an order to check its details.
                    </p>
                    {recentOrders.length > 0 ? (
                      <ul className='mt-3 divide-y' aria-label='Recent orders from this place'>
                        {recentOrders.map((order) => (
                          <li key={order.orderId} className='flex items-center justify-between gap-4 py-3'>
                            <div className='min-w-0'>
                              <p className='font-medium select-all'>{order.orderCode}</p>
                              <p className='text-sm text-muted-foreground'>{order.status}</p>
                            </div>
                            <Button asChild size='sm' variant='outline'>
                              <Link
                                to='/orders/$orderId'
                                params={{ orderId: order.orderId }}
                                search={{ place: place.slug }}
                              >
                                View order
                              </Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='mt-3 text-sm text-muted-foreground'>
                        No recent orders from this place are visible yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
          {blocked && (
            <CustomerAlert
              ref={errorRef}
              tabIndex={-1}
              tone='warning'
              title='Start a new checkout attempt'
              description='These checkout details can no longer be retried with the previous request. Review the details, then start a new attempt.'
              action={
                <Button type='button' size='sm' onClick={abandonAttempt}>
                  Start a new attempt
                </Button>
              }
              live
            />
          )}
          {detailsChanged && !uncertain && !blocked && (
            <CustomerAlert
              tone='warning'
              title='Order details changed'
              description='The previous attempt is tied to different details. Start a new attempt to use your edits.'
              action={
                <Button type='button' size='sm' onClick={abandonAttempt}>
                  Start a new attempt
                </Button>
              }
            />
          )}
          {presentation && (
            <CustomerAlert
              ref={errorRef}
              tabIndex={-1}
              tone={presentation.tone === 'conflict' ? 'warning' : 'error'}
              title={presentation.title}
              description={presentation.description}
              action={recoveryAction}
              live
            />
          )}

          <section className='rounded-surface border bg-surface p-4 sm:p-5' aria-labelledby='fulfillment-title'>
            <h2 id='fulfillment-title' className='text-lg font-semibold'>
              Fulfillment
            </h2>
            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              <label className='flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border-2 border-primary bg-primary/5 p-4'>
                <input
                  type='radio'
                  name='fulfillmentType'
                  value='TAKEAWAY'
                  checked
                  readOnly
                  className='mt-1 size-5 accent-primary'
                />
                <span>
                  <span className='block font-semibold'>Takeaway</span>
                  <span className='mt-1 block text-sm text-muted-foreground'>Collect this order from the place.</span>
                </span>
              </label>
              <label className='flex min-h-20 cursor-not-allowed items-start gap-3 rounded-lg border bg-surface-disabled p-4 text-disabled-foreground'>
                <input type='radio' name='fulfillmentType' value='DINE_IN' disabled className='mt-1 size-5' />
                <span>
                  <span className='flex items-center gap-2 font-semibold'>
                    <UtensilsIcon className='size-4' aria-hidden /> Dine in
                  </span>
                  <span className='mt-1 block text-sm'>
                    Table selection is not available for customer checkout yet.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className='rounded-surface border bg-surface p-4 sm:p-5' aria-labelledby='customer-details-title'>
            <h2 id='customer-details-title' className='text-lg font-semibold'>
              Customer details
            </h2>
            <div className='mt-4 grid gap-5'>
              <form.Field name='customerName' validators={{ onBlur: checkoutCustomerNameSchema }}>
                {(field) => {
                  const length = unicodeLength(field.state.value);
                  return (
                    <FormField
                      id='checkout-customer-name'
                      error={field.state.meta.isTouched ? firstErrorMessage(field.state.meta.errors) : undefined}
                    >
                      <div className='flex items-end justify-between gap-3'>
                        <FormLabel>Customer name</FormLabel>
                        <span className='text-xs tabular-nums text-muted-foreground'>
                          {length}/{CHECKOUT_CUSTOMER_NAME_MAX_LENGTH}
                        </span>
                      </div>
                      <FormControl>
                        <Input
                          name={field.name}
                          autoComplete='name'
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            setSubmissionError(undefined);
                            field.handleChange(event.target.value);
                          }}
                          disabled={mutation.isPending || uncertain || blocked}
                        />
                      </FormControl>
                      <FormDescription>Use the name the place should call for this order.</FormDescription>
                      <FormMessage />
                    </FormField>
                  );
                }}
              </form.Field>

              <form.Field name='customerNote' validators={{ onBlur: checkoutFormNoteSchema }}>
                {(field) => {
                  const length = unicodeLength(field.state.value);
                  const error = field.state.meta.isTouched ? firstErrorMessage(field.state.meta.errors) : undefined;
                  return (
                    <FormField id='checkout-customer-note' error={error}>
                      <div className='flex items-end justify-between gap-3'>
                        <FormLabel>Order note (optional)</FormLabel>
                        <span className='text-xs tabular-nums text-muted-foreground'>
                          {length}/{CHECKOUT_CUSTOMER_NOTE_MAX_LENGTH}
                        </span>
                      </div>
                      <FormControl>
                        <textarea
                          name={field.name}
                          rows={4}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            setSubmissionError(undefined);
                            field.handleChange(event.target.value);
                          }}
                          disabled={mutation.isPending || uncertain || blocked}
                          className='min-h-28 w-full resize-y rounded-md border border-input bg-form px-3 py-3 text-sm text-form-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-disabled-foreground'
                          placeholder='Add preparation or pickup information for the place'
                        />
                      </FormControl>
                      <FormDescription>Do not include payment or sensitive personal information.</FormDescription>
                      <FormMessage />
                    </FormField>
                  );
                }}
              </form.Field>
            </div>
          </section>

          <OrderReview cart={cart} />
        </div>

        <aside
          className='sticky top-24 hidden h-fit rounded-surface border bg-surface p-5 shadow-xs lg:block'
          aria-label='Checkout summary'
        >
          <h2 className='text-lg font-semibold'>Order summary</h2>
          <dl className='mt-4 space-y-3 text-sm'>
            <div className='flex justify-between gap-4'>
              <dt className='text-muted-foreground'>Fulfillment</dt>
              <dd className='font-medium'>Takeaway</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className='text-muted-foreground'>Items</dt>
              <dd className='font-medium tabular-nums'>{cart.aggregateQuantity}</dd>
            </div>
          </dl>
          <p className='mt-4 border-t pt-4 text-xs text-muted-foreground'>Final subtotal is confirmed by the server.</p>
          <div className='mt-5'>{submitButton()}</div>
        </aside>

        <StickyMobileActionBar
          aria-label='Checkout submission'
          className='bottom-[calc(4rem+var(--safe-area-bottom))] lg:hidden'
          reserveClassName='lg:hidden'
        >
          <div className='min-w-0 flex-1'>
            <p className='font-semibold tabular-nums'>
              {cart.aggregateQuantity} {cart.aggregateQuantity === 1 ? 'item' : 'items'}
            </p>
            <p className='text-xs text-muted-foreground'>Final total confirmed on submission</p>
          </div>
          {submitButton(true)}
        </StickyMobileActionBar>
      </form>
    </div>
  );
}

export function CheckoutPage({ slug }: { slug: string }) {
  const placeQuery = useQuery(publicPlaceQueryOptions(slug));

  if (placeQuery.isPending) return <CheckoutSkeleton />;
  if (placeQuery.isError || !placeQuery.data) {
    return <CheckoutLoadError error={placeQuery.error} retry={() => void placeQuery.refetch()} />;
  }

  return <ResolvedCheckoutPage place={placeQuery.data} />;
}
