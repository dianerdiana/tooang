import { useState } from 'react';

import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { QuantityControl } from '@/components/ui/quantity-control';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { PublicMenuItemReviews } from '@/features/reviews/components/public-menu-item-reviews';

import { formatCurrency } from '@/utils/format-currency';

import type { PublicMenuItem } from '../types/menu-items.type';

type PublicMenuItemDetailProps = {
  placeId: string;
  item: PublicMenuItem & { categoryName: string };
  orderingEnabled: boolean;
};

const typeLabels = { FOOD: 'Food', DRINK: 'Drinks' } as const;

function PublicMenuItemDetail({ placeId, item, orderingEnabled }: PublicMenuItemDetailProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
              Available on the current public menu. Price is confirmed again at checkout.
            </p>
          </section>

          <section
            aria-labelledby={`item-draft-${item.menuItemId}`}
            className='space-y-4 rounded-surface bg-surface-subtle p-4'
          >
            <h2 id={`item-draft-${item.menuItemId}`} className='font-semibold'>
              Order draft
            </h2>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <span className='text-sm font-medium'>Quantity</span>
              <QuantityControl value={quantity} onValueChange={setQuantity} />
            </div>
            <div>
              <label htmlFor={`item-note-${item.menuItemId}`} className='text-sm font-medium'>
                Item note (optional)
              </label>
              <textarea
                id={`item-note-${item.menuItemId}`}
                value={note}
                maxLength={500}
                rows={3}
                onChange={(event) => setNote(event.target.value)}
                placeholder='Example: less spicy'
                className='mt-2 min-h-24 w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              />
              <p className='mt-1 text-right text-xs text-muted-foreground'>{note.length}/500</p>
            </div>
            <Button type='button' className='min-h-12 w-full' disabled>
              <PlusIcon aria-hidden /> Add {quantity} to cart
            </Button>
            <p className='text-xs text-muted-foreground'>
              {orderingEnabled
                ? 'Adding to cart will be enabled in the protected cart flow.'
                : 'Online ordering is currently unavailable, but menu details remain visible.'}
            </p>
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
