import { useState } from 'react';

import { PlusIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { LiveRegion } from '@/components/ui/live-region';
import { QuantityControl } from '@/components/ui/quantity-control';

import { ProtectedActionLoginLink } from '@/features/auth/components/protected-action-login-link';
import {
  useAddCartItemMutation,
  useCartItemPending,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/features/cart/queries/cart.mutation';
import {
  CART_MAX_AGGREGATE_QUANTITY,
  CART_MAX_DISTINCT_ITEMS,
  CART_MAX_ITEM_QUANTITY,
} from '@/features/cart/schemas/cart.schema';
import type { Cart } from '@/features/cart/types/cart.type';

import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';

type MenuItemCartControlsProps = {
  cart?: Cart;
  cartReady: boolean;
  isAuthenticated: boolean;
  menuItemId: string;
  placeId: string;
  placeSlug: string;
  returnTo: string;
};

function MenuItemCartControls({
  cart,
  cartReady,
  isAuthenticated,
  menuItemId,
  placeId,
  placeSlug,
  returnTo,
}: MenuItemCartControlsProps) {
  const [error, setError] = useState<unknown>();
  const [announcement, setAnnouncement] = useState('');
  const addMutation = useAddCartItemMutation(placeId, menuItemId);
  const updateMutation = useUpdateCartItemMutation(placeId, menuItemId);
  const removeMutation = useRemoveCartItemMutation(placeId, menuItemId);
  const pending = useCartItemPending(placeId, menuItemId);
  const confirmedItem = cart?.items.find((item) => item.menuItemId === menuItemId);
  const presentation = error ? getCustomerErrorPresentation(error) : null;

  const run = async (action: () => Promise<Cart>) => {
    setError(undefined);
    try {
      const nextCart = await action();
      const next = nextCart.items.find((item) => item.menuItemId === menuItemId);
      setAnnouncement(
        next
          ? `Cart updated. Quantity ${next.quantity}. ${nextCart.aggregateQuantity} items in this cart.`
          : `Item removed. ${nextCart.aggregateQuantity} items in this cart.`,
      );
    } catch (nextError) {
      setError(nextError);
      setAnnouncement(getCustomerErrorPresentation(nextError).description);
    }
  };

  const distinctLimit = !confirmedItem && (cart?.distinctItemCount ?? 0) >= CART_MAX_DISTINCT_ITEMS;
  const aggregateLimit = (cart?.aggregateQuantity ?? 0) >= CART_MAX_AGGREGATE_QUANTITY;

  return (
    <div className='space-y-2'>
      {confirmedItem ? (
        <div className='flex flex-wrap items-center gap-2'>
          <QuantityControl
            value={confirmedItem.quantity}
            min={1}
            max={Math.min(
              CART_MAX_ITEM_QUANTITY,
              confirmedItem.quantity + CART_MAX_AGGREGATE_QUANTITY - (cart?.aggregateQuantity ?? 0),
            )}
            label={`${confirmedItem.name} quantity`}
            disabled={pending}
            loading={pending}
            onValueChange={(quantity) => void run(() => updateMutation.mutateAsync({ quantity }))}
          />
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='min-h-11 text-destructive'
            disabled={pending}
            onClick={() => void run(() => removeMutation.mutateAsync())}
          >
            <Trash2Icon aria-hidden /> Remove
          </Button>
        </div>
      ) : isAuthenticated ? (
        <Button
          type='button'
          size='sm'
          className='min-h-11 w-full'
          disabled={!cartReady || pending || distinctLimit || aggregateLimit}
          onClick={() => void run(() => addMutation.mutateAsync({ quantity: 1 }))}
        >
          <PlusIcon aria-hidden /> {!cartReady ? 'Loading cart…' : pending ? 'Adding…' : 'Add to cart'}
        </Button>
      ) : (
        <Button type='button' size='sm' className='min-h-11 w-full' asChild>
          <ProtectedActionLoginLink
            intent={{
              kind: 'add-to-cart',
              payload: { placeId, placeSlug, menuItemId, quantity: 1 },
              returnTo,
            }}
          >
            <span className='inline-flex items-center gap-2'>
              <PlusIcon aria-hidden /> Sign in to add
            </span>
          </ProtectedActionLoginLink>
        </Button>
      )}

      {(distinctLimit || aggregateLimit) && !confirmedItem && (
        <p className='text-xs text-muted-foreground'>
          {distinctLimit
            ? 'This cart already has 50 distinct items.'
            : 'This cart has reached its total quantity limit.'}
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
    </div>
  );
}

export { MenuItemCartControls, type MenuItemCartControlsProps };
