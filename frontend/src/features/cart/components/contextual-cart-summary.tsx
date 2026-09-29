import { Link } from '@tanstack/react-router';
import { ShoppingBagIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StickyMobileActionBar } from '@/components/ui/sticky-mobile-action-bar';

import type { Cart } from '../types/cart.type';

function getContextualCartQuantity(cart: Cart | undefined, placeId: string) {
  return cart?.placeId === placeId ? cart.aggregateQuantity : 0;
}

function ContextualCartSummary({
  cart,
  placeId,
  placeName,
  placeSlug,
}: {
  cart: Cart | undefined;
  placeId: string;
  placeName: string;
  placeSlug: string;
}) {
  const quantity = getContextualCartQuantity(cart, placeId);
  if (quantity <= 0) return null;

  return (
    <StickyMobileActionBar
      aria-label={`${placeName} cart summary`}
      className='bottom-[calc(4rem+var(--safe-area-bottom))] md:bottom-4 md:mx-auto md:max-w-3xl md:rounded-surface md:border'
    >
      <ShoppingBagIcon className='size-5 shrink-0 text-primary' aria-hidden />
      <div className='min-w-0 flex-1'>
        <p className='truncate font-semibold'>{placeName} cart</p>
        <p className='text-sm text-muted-foreground tabular-nums'>
          {quantity} {quantity === 1 ? 'item' : 'items'} confirmed
        </p>
      </div>
      <Button asChild className='min-h-11 shrink-0'>
        <Link to='/places/$slug/cart' params={{ slug: placeSlug }}>
          Review cart
        </Link>
      </Button>
    </StickyMobileActionBar>
  );
}

export { ContextualCartSummary, getContextualCartQuantity };
