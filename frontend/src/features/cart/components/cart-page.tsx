import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, RefreshCwIcon, SaveIcon, ShoppingBagIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { PlaceOpenStateBadge, PlaceOrderingStateBadge } from '@/components/ui/customer-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LiveRegion } from '@/components/ui/live-region';
import { QuantityControl } from '@/components/ui/quantity-control';
import { Skeleton } from '@/components/ui/skeleton';
import { StickyMobileActionBar } from '@/components/ui/sticky-mobile-action-bar';

import {
  useCartItemPending,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/features/cart/queries/cart.mutation';
import { cartQueryOptions } from '@/features/cart/queries/cart.query';
import {
  CART_MAX_AGGREGATE_QUANTITY,
  CART_MAX_ITEM_QUANTITY,
  CART_MAX_NOTE_LENGTH,
  normalizeCartNote,
} from '@/features/cart/schemas/cart.schema';
import type { Cart, CartItem, CartRemovedItemReason, RemovedCartItem } from '@/features/cart/types/cart.type';
import { publicPlaceQueryOptions } from '@/features/places/queries/places.query';
import type { PublicPlaceDetail } from '@/features/places/types/places.type';

import { isApplicationError } from '@/utils/api-error.util';
import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { formatCurrency } from '@/utils/format-currency';

const itemTypeLabel = { FOOD: 'Food', DRINK: 'Drink' } as const;

const removedReasonCopy: Record<CartRemovedItemReason, string> = {
  ITEM_DELETED: 'The menu item was removed from the menu.',
  ITEM_UNAVAILABLE: 'The menu item is no longer available.',
  CATEGORY_DELETED: 'The item category was removed.',
  CATEGORY_INACTIVE: 'The item category is currently inactive.',
};

type CartPageProps = { slug: string };

function CartPageSkeleton() {
  return (
    <div className='mx-auto w-full max-w-6xl space-y-6 px-page py-6 sm:py-8' role='status' aria-label='Loading cart'>
      <div className='space-y-3'>
        <Skeleton className='h-11 w-32' />
        <Skeleton className='h-9 w-2/3 max-w-md' />
        <Skeleton className='h-5 w-48' />
      </div>
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='space-y-3'>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className='space-y-4 rounded-surface border bg-surface p-4'>
              <div className='flex justify-between gap-4'>
                <div className='w-full space-y-2'>
                  <Skeleton className='h-5 w-1/2' />
                  <Skeleton className='h-4 w-1/3' />
                </div>
                <Skeleton className='h-5 w-24' />
              </div>
              <Skeleton className='h-11 w-48' />
              <Skeleton className='h-20 w-full' />
            </div>
          ))}
        </div>
        <Skeleton className='hidden h-56 rounded-surface lg:block' />
      </div>
    </div>
  );
}

function CartReconciliationAlert({ removedItems }: { removedItems: RemovedCartItem[] }) {
  if (removedItems.length === 0) return null;
  return (
    <CustomerAlert
      tone='warning'
      title='Your cart was updated'
      description={
        <div className='space-y-2'>
          <p>Items that can no longer be ordered were removed. Review the current cart before checkout.</p>
          <ul className='list-disc space-y-1 pl-5'>
            {removedItems.map((item, index) => (
              <li key={`${item.menuItemId}-${item.reason}-${index}`}>{removedReasonCopy[item.reason]}</li>
            ))}
          </ul>
        </div>
      }
      live
    />
  );
}

function CartAvailabilityAlerts({ place }: { place: PublicPlaceDetail }) {
  return (
    <>
      {!place.isOpen && (
        <CustomerAlert
          tone='warning'
          title='This place is closed'
          description='You can continue editing this cart, but checkout is unavailable until the place opens.'
        />
      )}
      {!place.isOrderingEnabled && (
        <CustomerAlert
          tone='warning'
          title='Online ordering is unavailable'
          description='You can keep or edit these items, but checkout is unavailable while ordering is off.'
        />
      )}
    </>
  );
}

function CartLineItem({ cart, item }: { cart: Cart; item: CartItem }) {
  const [note, setNote] = useState(item.note ?? '');
  const [error, setError] = useState<unknown>();
  const [announcement, setAnnouncement] = useState('');
  const updateMutation = useUpdateCartItemMutation(cart.placeId, item.menuItemId);
  const removeMutation = useRemoveCartItemMutation(cart.placeId, item.menuItemId);
  const pending = useCartItemPending(cart.placeId, item.menuItemId);
  const noteLength = Array.from(note).length;
  const noteInvalid = noteLength > CART_MAX_NOTE_LENGTH;
  const normalizedNote = noteInvalid ? null : normalizeCartNote(note);
  const presentation = error ? getCustomerErrorPresentation(error) : null;
  const maximum = Math.min(
    CART_MAX_ITEM_QUANTITY,
    item.quantity + CART_MAX_AGGREGATE_QUANTITY - cart.aggregateQuantity,
  );

  const run = async (action: () => Promise<Cart>, success: string) => {
    setError(undefined);
    try {
      const nextCart = await action();
      const nextItem = nextCart.items.find((candidate) => candidate.menuItemId === item.menuItemId);
      if (nextItem) setNote(nextItem.note ?? '');
      setAnnouncement(`${success} ${nextCart.aggregateQuantity} items remain in this cart.`);
    } catch (nextError) {
      setError(nextError);
      setAnnouncement(getCustomerErrorPresentation(nextError).description);
    }
  };

  return (
    <article
      className='space-y-4 rounded-surface border bg-surface p-4 shadow-xs'
      aria-labelledby={`cart-${item.menuItemId}`}
    >
      <div className='flex min-w-0 items-start justify-between gap-4'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold text-primary'>
            {item.category.name} · {itemTypeLabel[item.type]}
          </p>
          <h2 id={`cart-${item.menuItemId}`} className='mt-1 wrap-break-word text-lg font-semibold'>
            {item.name}
          </h2>
        </div>
        <div className='shrink-0 text-right'>
          <p className='font-semibold tabular-nums'>{formatCurrency(item.unitPrice)}</p>
          <p className='text-xs text-muted-foreground'>Current unit price</p>
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <span className='text-sm font-medium'>Quantity</span>
        <div className='flex flex-wrap items-center gap-2'>
          <QuantityControl
            value={item.quantity}
            min={1}
            max={maximum}
            label={`${item.name} quantity`}
            disabled={pending}
            loading={pending}
            onValueChange={(quantity) =>
              void run(() => updateMutation.mutateAsync({ quantity }), `Quantity updated to ${quantity}.`)
            }
          />
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='min-h-11 text-destructive'
            disabled={pending}
            onClick={() => void run(() => removeMutation.mutateAsync(), `${item.name} removed.`)}
          >
            <Trash2Icon aria-hidden /> Remove
          </Button>
        </div>
      </div>

      <div>
        <label htmlFor={`cart-note-${item.menuItemId}`} className='text-sm font-medium'>
          Item note (optional)
        </label>
        <textarea
          id={`cart-note-${item.menuItemId}`}
          value={note}
          rows={2}
          aria-invalid={noteInvalid || undefined}
          aria-describedby={`cart-note-help-${item.menuItemId}`}
          onChange={(event) => setNote(event.target.value)}
          placeholder='Example: less spicy'
          className='mt-2 min-h-20 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        />
        <div className='mt-1 flex flex-wrap items-center justify-between gap-2'>
          <p
            id={`cart-note-help-${item.menuItemId}`}
            className={`text-xs ${noteInvalid ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {noteLength}/{CART_MAX_NOTE_LENGTH} characters
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='min-h-11'
            disabled={pending || noteInvalid || normalizedNote === item.note}
            onClick={() => void run(() => updateMutation.mutateAsync({ note: normalizedNote }), 'Item note saved.')}
          >
            <SaveIcon aria-hidden /> {pending ? 'Saving…' : 'Save note'}
          </Button>
        </div>
      </div>

      {presentation && (
        <CustomerAlert
          tone={presentation.tone === 'not-found' ? 'warning' : 'error'}
          title={presentation.title}
          description={presentation.description}
          action={
            presentation.action === 'refresh' ? (
              <Button type='button' variant='outline' size='sm' onClick={() => setError(undefined)}>
                Dismiss
              </Button>
            ) : undefined
          }
          live
        />
      )}
      <LiveRegion>{announcement}</LiveRegion>
    </article>
  );
}

function CheckoutAction({ place, cart, mobile = false }: { place: PublicPlaceDetail; cart: Cart; mobile?: boolean }) {
  const canCheckout = cart.items.length > 0 && place.isOpen && place.isOrderingEnabled;
  const reason = !cart.items.length
    ? 'Add an item before checkout.'
    : !place.isOrderingEnabled
      ? 'Checkout is unavailable while online ordering is off.'
      : !place.isOpen
        ? 'Checkout is unavailable while this place is closed.'
        : 'Prices and eligibility are confirmed by the server during checkout.';

  const content = (
    <>
      <div className='min-w-0 flex-1'>
        <p className='font-semibold tabular-nums'>
          {cart.aggregateQuantity} {cart.aggregateQuantity === 1 ? 'item' : 'items'}
        </p>
        <p className='text-xs text-muted-foreground'>{reason}</p>
      </div>
      {canCheckout ? (
        <Button asChild className='min-h-12 shrink-0'>
          <Link to='/places/$slug/checkout' params={{ slug: place.slug }}>
            Continue to checkout
          </Link>
        </Button>
      ) : (
        <Button type='button' className='min-h-12 shrink-0' disabled>
          Checkout unavailable
        </Button>
      )}
    </>
  );

  return mobile ? (
    <StickyMobileActionBar
      aria-label='Cart checkout actions'
      className='bottom-[calc(4rem+var(--safe-area-bottom))] md:hidden'
    >
      {content}
    </StickyMobileActionBar>
  ) : (
    <aside
      className='sticky top-24 hidden self-start rounded-surface border bg-surface p-5 shadow-xs lg:block'
      aria-label='Cart summary'
    >
      <h2 className='text-lg font-semibold'>Cart summary</h2>
      <div className='mt-4 flex flex-col items-stretch gap-4'>{content}</div>
      <p className='mt-4 border-t pt-4 text-xs text-muted-foreground'>
        No subtotal is shown because the cart API does not currently return an authoritative total.
      </p>
    </aside>
  );
}

function CartError({
  error,
  retry,
  isRetrying,
  slug,
  fallback = 'menu',
}: {
  error: unknown;
  retry: () => void;
  isRetrying: boolean;
  slug: string;
  fallback?: 'menu' | 'discover';
}) {
  const presentation = getCustomerErrorPresentation(error);
  const signedOut = isApplicationError(error) && error.httpStatus === 401;
  return (
    <ErrorState
      title={presentation.title}
      description={presentation.description}
      tone={presentation.tone}
      onRetry={presentation.action === 'retry' || presentation.action === 'refresh' ? retry : undefined}
      retryLabel={presentation.action === 'refresh' ? 'Refresh cart' : 'Try again'}
      isRetrying={isRetrying}
      secondaryAction={
        signedOut ? (
          <Button asChild>
            <Link to='/login' search={{ redirect: `/places/${slug}/cart` }}>
              Sign in again
            </Link>
          </Button>
        ) : (
          <Button variant='outline' asChild>
            {fallback === 'discover' ? (
              <Link to='/'>Return to discovery</Link>
            ) : (
              <Link to='/places/$slug/menu' params={{ slug }}>
                Return to menu
              </Link>
            )}
          </Button>
        )
      }
    />
  );
}

function ResolvedCartPage({ place }: { place: PublicPlaceDetail }) {
  const cartQuery = useQuery(cartQueryOptions(place.id));

  if (cartQuery.isPending) return <CartPageSkeleton />;
  if (cartQuery.isError && !cartQuery.data) {
    return (
      <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
        <CartError
          error={cartQuery.error}
          retry={() => void cartQuery.refetch()}
          isRetrying={cartQuery.isFetching}
          slug={place.slug}
        />
      </div>
    );
  }

  const cart = cartQuery.data;
  if (!cart) return null;

  return (
    <div className='mx-auto w-full max-w-6xl px-page py-6 sm:py-8'>
      <header className='space-y-4'>
        <Button variant='ghost' asChild className='-ml-3 min-h-11'>
          <Link to='/places/$slug/menu' params={{ slug: place.slug }}>
            <ArrowLeftIcon aria-hidden /> Back to menu
          </Link>
        </Button>
        <div>
          <p className='text-sm font-semibold text-primary'>Cart at</p>
          <h1 className='mt-1 wrap-break-word text-3xl font-bold tracking-tight'>{place.name}</h1>
          <p className='mt-1 text-muted-foreground'>Review current items before continuing to checkout.</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <PlaceOpenStateBadge state={place.isOpen ? 'OPEN' : 'CLOSED'} />
          <PlaceOrderingStateBadge enabled={place.isOrderingEnabled} />
        </div>
      </header>

      <div className='mt-6 space-y-4'>
        <CartReconciliationAlert removedItems={cart.removedItems} />
        <CartAvailabilityAlerts place={place} />
        {cartQuery.isFetching && (
          <div className='flex items-center gap-2 text-sm text-muted-foreground' role='status'>
            <RefreshCwIcon className='size-4 animate-spin motion-reduce:animate-none' aria-hidden />
            Refreshing current cart…
          </div>
        )}
        {cartQuery.isError && cartQuery.data && (
          <CustomerAlert
            tone='error'
            title='Cart could not be refreshed'
            description='The confirmed cart shown below is still available. Try refreshing before checkout.'
            action={
              <Button type='button' variant='outline' size='sm' onClick={() => void cartQuery.refetch()}>
                Try again
              </Button>
            }
            live
          />
        )}
      </div>

      {cart.items.length === 0 ? (
        <EmptyState
          className='mt-6'
          icon={ShoppingBagIcon}
          title='Your cart is empty'
          description='Add an available menu item from this place to start an order.'
          action={
            <Button asChild>
              <Link to='/places/$slug/menu' params={{ slug: place.slug }}>
                Browse menu
              </Link>
            </Button>
          }
        />
      ) : (
        <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
          <section className='space-y-3' aria-label='Cart items'>
            {cart.items.map((item) => (
              <CartLineItem key={`${item.menuItemId}:${item.note ?? ''}`} cart={cart} item={item} />
            ))}
          </section>
          <CheckoutAction place={place} cart={cart} />
        </div>
      )}

      <CheckoutAction place={place} cart={cart} mobile />
    </div>
  );
}

function CartPage({ slug }: CartPageProps) {
  const placeQuery = useQuery(publicPlaceQueryOptions(slug));

  if (placeQuery.isPending) return <CartPageSkeleton />;
  if (placeQuery.isError && !placeQuery.data) {
    return (
      <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
        <CartError
          error={placeQuery.error}
          retry={() => void placeQuery.refetch()}
          isRetrying={placeQuery.isFetching}
          slug={slug}
          fallback='discover'
        />
      </div>
    );
  }

  return placeQuery.data ? <ResolvedCartPage place={placeQuery.data} /> : null;
}

export {
  CartAvailabilityAlerts,
  CartLineItem,
  CartPage,
  type CartPageProps,
  CartPageSkeleton,
  CartReconciliationAlert,
  CheckoutAction,
  removedReasonCopy,
  ResolvedCartPage,
};
