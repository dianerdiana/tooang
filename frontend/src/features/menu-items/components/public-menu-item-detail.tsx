import { useState } from 'react';

import { PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { LiveRegion } from '@/components/ui/live-region';
import { QuantityControl } from '@/components/ui/quantity-control';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { ProtectedActionLoginLink } from '@/features/auth/components/protected-action-login-link';
import {
  useAddCartItemMutation,
  useCartItemPending,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/features/cart/queries/cart.mutation';
import {
  CART_MAX_AGGREGATE_QUANTITY,
  CART_MAX_ITEM_QUANTITY,
  CART_MAX_NOTE_LENGTH,
  normalizeCartNote,
} from '@/features/cart/schemas/cart.schema';
import type { Cart } from '@/features/cart/types/cart.type';
import { PublicMenuItemReviews } from '@/features/reviews/components/public-menu-item-reviews';

import type { ProtectedActionIntent } from '@/utils/auth/protected-action-intent';
import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { formatCurrency } from '@/utils/format-currency';

import type { PublicMenuItem } from '../types/menu-items.type';

type RestoredAddToCartIntent = Extract<ProtectedActionIntent, { kind: 'add-to-cart' }>;

type PublicMenuItemDetailProps = {
  cart?: Cart;
  cartReady: boolean;
  isAuthenticated: boolean;
  placeId: string;
  placeSlug: string;
  item: PublicMenuItem & { categoryName: string };
  orderingEnabled: boolean;
  returnTo: string;
  restoredIntent?: RestoredAddToCartIntent;
};

const typeLabels = { FOOD: 'Food', DRINK: 'Drinks' } as const;

function PublicMenuItemDetail({
  cart,
  cartReady,
  isAuthenticated,
  placeId,
  placeSlug,
  item,
  orderingEnabled,
  returnTo,
  restoredIntent,
}: PublicMenuItemDetailProps) {
  const [open, setOpen] = useState(Boolean(restoredIntent));
  const [quantity, setQuantity] = useState(restoredIntent?.payload.quantity ?? 1);
  const [note, setNote] = useState(restoredIntent?.payload.note ?? '');
  const [error, setError] = useState<unknown>();
  const [announcement, setAnnouncement] = useState('');
  const addMutation = useAddCartItemMutation(placeId, item.menuItemId);
  const updateMutation = useUpdateCartItemMutation(placeId, item.menuItemId);
  const removeMutation = useRemoveCartItemMutation(placeId, item.menuItemId);
  const pending = useCartItemPending(placeId, item.menuItemId);
  const confirmedItem = cart?.items.find((candidate) => candidate.menuItemId === item.menuItemId);
  const noteLength = Array.from(note).length;
  const noteInvalid = noteLength > CART_MAX_NOTE_LENGTH;
  const normalizedNote = noteInvalid ? null : normalizeCartNote(note);
  const presentation = error ? getCustomerErrorPresentation(error) : null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !restoredIntent) {
      setQuantity(1);
      setNote(confirmedItem?.note ?? '');
      setError(undefined);
    }
    setOpen(nextOpen);
  };

  const run = async (action: () => Promise<Cart>, success: string) => {
    setError(undefined);
    try {
      const nextCart = await action();
      const nextItem = nextCart.items.find((candidate) => candidate.menuItemId === item.menuItemId);
      setNote(nextItem?.note ?? '');
      setAnnouncement(`${success} ${nextCart.aggregateQuantity} items in this cart.`);
    } catch (nextError) {
      setError(nextError);
      setAnnouncement(getCustomerErrorPresentation(nextError).description);
    }
  };

  const maxConfirmedQuantity = confirmedItem
    ? Math.min(
        CART_MAX_ITEM_QUANTITY,
        confirmedItem.quantity + CART_MAX_AGGREGATE_QUANTITY - (cart?.aggregateQuantity ?? 0),
      )
    : CART_MAX_ITEM_QUANTITY;

  const draftIntent = {
    kind: 'add-to-cart' as const,
    payload: {
      placeId,
      placeSlug,
      menuItemId: item.menuItemId,
      quantity,
      ...(normalizedNote ? { note: normalizedNote } : {}),
    },
    returnTo,
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type='button' variant='outline' size='sm' className='min-h-11 w-full'>
          View details
        </Button>
      </SheetTrigger>
      <SheetContent
        side='bottom'
        className='max-h-[92dvh] rounded-t-xl md:inset-x-auto md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[min(42rem,100vw)] md:rounded-none md:border-t-0 md:border-l'
      >
        <SheetHeader className='pr-12'>
          <SheetTitle className='break-words'>{item.name}</SheetTitle>
          <SheetDescription>
            {item.categoryName} · {typeLabels[item.type]}
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 space-y-6 overflow-y-auto px-card pb-[max(var(--card-padding),var(--safe-area-bottom))]'>
          <ResponsiveImage
            src={item.imageUrl ?? undefined}
            alt={item.imageUrl ? item.name : ''}
            fallbackLabel={`${item.name} image unavailable`}
            className='rounded-surface'
          />
          <section aria-labelledby={`item-overview-${item.menuItemId}`} className='space-y-3'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <h2 id={`item-overview-${item.menuItemId}`} className='break-words text-xl font-bold'>
                {item.name}
              </h2>
              <p className='shrink-0 text-lg font-bold tabular-nums'>{formatCurrency(item.price)}</p>
            </div>
            <p className='break-words whitespace-pre-line text-sm text-muted-foreground'>
              {item.description || 'No description available.'}
            </p>
            <p className='text-xs text-muted-foreground'>
              Current menu price. The server confirms item eligibility and price again at checkout.
            </p>
          </section>

          <section
            aria-labelledby={`item-draft-${item.menuItemId}`}
            className='space-y-4 rounded-surface bg-surface-subtle p-4'
          >
            <h2 id={`item-draft-${item.menuItemId}`} className='font-semibold'>
              {confirmedItem ? 'Cart item' : 'Order draft'}
            </h2>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <span className='text-sm font-medium'>Quantity</span>
              <QuantityControl
                value={confirmedItem?.quantity ?? quantity}
                min={1}
                max={confirmedItem ? maxConfirmedQuantity : CART_MAX_ITEM_QUANTITY}
                label={`${item.name} quantity`}
                disabled={pending}
                loading={confirmedItem ? pending : false}
                onValueChange={(nextQuantity) => {
                  if (confirmedItem) {
                    void run(
                      () => updateMutation.mutateAsync({ quantity: nextQuantity }),
                      `Quantity updated to ${nextQuantity}.`,
                    );
                  } else {
                    setQuantity(nextQuantity);
                  }
                }}
              />
            </div>
            <div>
              <label htmlFor={`item-note-${item.menuItemId}`} className='text-sm font-medium'>
                Item note (optional)
              </label>
              <textarea
                id={`item-note-${item.menuItemId}`}
                value={note}
                rows={3}
                aria-invalid={noteInvalid || undefined}
                aria-describedby={`item-note-help-${item.menuItemId}`}
                onChange={(event) => setNote(event.target.value)}
                placeholder='Example: less spicy'
                className='mt-2 min-h-24 w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              />
              <p
                id={`item-note-help-${item.menuItemId}`}
                className={`mt-1 text-right text-xs ${noteInvalid ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {noteLength}/{CART_MAX_NOTE_LENGTH} characters
              </p>
            </div>

            {confirmedItem ? (
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Button
                  type='button'
                  className='min-h-11 flex-1'
                  disabled={pending || noteInvalid || normalizedNote === confirmedItem.note}
                  onClick={() =>
                    void run(() => updateMutation.mutateAsync({ note: normalizedNote }), 'Item note saved.')
                  }
                >
                  <SaveIcon aria-hidden /> {pending ? 'Saving…' : 'Save note'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='min-h-11 text-destructive'
                  disabled={pending}
                  onClick={() => void run(() => removeMutation.mutateAsync(), 'Item removed.')}
                >
                  <Trash2Icon aria-hidden /> Remove
                </Button>
              </div>
            ) : isAuthenticated ? (
              <Button
                type='button'
                className='min-h-12 w-full'
                disabled={!cartReady || pending || noteInvalid}
                onClick={() =>
                  void run(
                    () => addMutation.mutateAsync({ quantity, note: normalizedNote }),
                    `${quantity} added to cart.`,
                  )
                }
              >
                <PlusIcon aria-hidden />
                {!cartReady ? 'Loading cart…' : pending ? 'Adding…' : `Add ${quantity} to cart`}
              </Button>
            ) : (
              <Button type='button' className='min-h-12 w-full' disabled={noteInvalid} asChild={!noteInvalid}>
                {noteInvalid ? (
                  <span>Check item note</span>
                ) : (
                  <ProtectedActionLoginLink intent={draftIntent}>
                    <span className='inline-flex items-center gap-2'>
                      <PlusIcon aria-hidden /> Sign in to add {quantity}
                    </span>
                  </ProtectedActionLoginLink>
                )}
              </Button>
            )}

            {!orderingEnabled && (
              <p className='text-xs text-muted-foreground'>
                You can keep this cart updated, but checkout is unavailable while online ordering is off.
              </p>
            )}
            {presentation && (
              <CustomerAlert
                tone={presentation.tone === 'not-found' ? 'warning' : 'error'}
                title={presentation.title}
                description={presentation.description}
                live
              />
            )}
            <LiveRegion>{announcement}</LiveRegion>
          </section>

          <section aria-labelledby={`item-reviews-${item.menuItemId}`} className='space-y-4'>
            <h2 id={`item-reviews-${item.menuItemId}`} className='text-xl font-bold'>
              Item reviews
            </h2>
            {open && <PublicMenuItemReviews placeId={placeId} menuItemId={item.menuItemId} />}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { PublicMenuItemDetail, type PublicMenuItemDetailProps };
