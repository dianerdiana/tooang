import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CheckCircle2Icon, MessageSquarePlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';

import type { OrderDetail } from '@/features/orders/types/order.type';

import { useCreateMenuItemReviewMutation, useCreatePlaceReviewMutation } from '../queries/reviews.mutation';
import { ownReviewsQueryOptions } from '../queries/reviews.query';
import type { ReviewUpdateInput } from '../types/reviews.type';
import type { OwnMenuItemReview } from '../types/reviews.type';

import { ReviewFormDialog } from './review-form-dialog';

type ReviewTarget = { kind: 'place'; label: string } | { kind: 'menu-item'; label: string; menuItemId: string };

function ReviewAction({
  order,
  target,
  reviewed,
  onAnnounce,
}: {
  order: OrderDetail;
  target: ReviewTarget;
  reviewed: boolean;
  onAnnounce: (message: string) => void;
}) {
  const placeMutation = useCreatePlaceReviewMutation();
  const itemMutation = useCreateMenuItemReviewMutation();
  const mutation = target.kind === 'place' ? placeMutation : itemMutation;
  const title = target.kind === 'place' ? `Review ${order.place.name}` : `Review ${target.label}`;

  if (reviewed) {
    return (
      <div className='flex min-h-11 items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2'>
        <span className='flex min-w-0 items-center gap-2 text-sm font-medium'>
          <CheckCircle2Icon className='size-4 shrink-0 text-success' aria-hidden />
          <span className='truncate'>{target.label}</span>
        </span>
        <Button variant='ghost' size='sm' asChild>
          <Link
            to='/account/reviews'
            search={{ tab: target.kind === 'place' ? 'place' : 'menu-item', page: 1, limit: 20 }}
          >
            Reviewed
          </Link>
        </Button>
      </div>
    );
  }

  const submit = async (input: Required<Pick<ReviewUpdateInput, 'rating' | 'comment'>>) => {
    const result =
      target.kind === 'place'
        ? await placeMutation.mutateAsync({ placeId: order.place.placeId, input: { orderId: order.orderId, ...input } })
        : await itemMutation.mutateAsync({
            placeId: order.place.placeId,
            menuItemId: target.menuItemId,
            input: { orderId: order.orderId, ...input },
          });
    const message =
      result.outcome === 'restored'
        ? `Your review for ${target.label} was restored and updated.`
        : `Your review for ${target.label} was submitted.`;
    onAnnounce(message);
    toast.success(result.outcome === 'restored' ? 'Review restored and updated' : 'Review submitted');
  };

  return (
    <ReviewFormDialog
      trigger={
        <Button
          type='button'
          variant='outline'
          className='h-auto min-h-11 w-full justify-start whitespace-normal text-left'
        >
          <MessageSquarePlusIcon aria-hidden />
          Review {target.label}
        </Button>
      }
      title={title}
      description={`Share feedback from completed order ${order.orderCode}.`}
      submitLabel='Submit review'
      pending={mutation.isPending}
      error={mutation.error}
      onOpenChange={(open) => {
        if (open) mutation.reset();
      }}
      onSubmit={submit}
    />
  );
}

export function OrderReviewActions({ order }: { order: OrderDetail }) {
  const [announcement, setAnnouncement] = useState('');
  const placeReviews = useQuery(ownReviewsQueryOptions('place', { page: 1, limit: 100 }));
  const itemReviews = useQuery(ownReviewsQueryOptions('menu-item', { page: 1, limit: 100 }));
  const uniqueItems = useMemo(
    () => [...new Map(order.items.map((item) => [item.menuItemId, item])).values()],
    [order.items],
  );
  const knownItemReviews = itemReviews.data?.reviews as OwnMenuItemReview[] | undefined;
  const placeReviewed = Boolean(placeReviews.data?.reviews.some((review) => review.order.orderId === order.orderId));

  return (
    <section className='rounded-surface border bg-surface p-5' aria-labelledby='review-order-title'>
      <LiveRegion>{announcement}</LiveRegion>
      <h2 id='review-order-title' className='font-semibold'>
        Review this order
      </h2>
      <p className='mt-1 text-sm text-muted-foreground'>
        Reviews are tied to this completed purchase. The service confirms eligibility when you submit.
      </p>
      {(placeReviews.isError || itemReviews.isError) && (
        <p className='mt-3 text-sm text-muted-foreground' role='status'>
          Review history could not be checked completely. You can still submit and eligibility will be verified.
        </p>
      )}
      <div className='mt-4 grid gap-2'>
        <ReviewAction
          order={order}
          target={{ kind: 'place', label: order.place.name }}
          reviewed={placeReviewed}
          onAnnounce={setAnnouncement}
        />
        {uniqueItems.map((item) => (
          <ReviewAction
            key={item.menuItemId}
            order={order}
            target={{ kind: 'menu-item', label: item.itemName, menuItemId: item.menuItemId }}
            reviewed={Boolean(
              knownItemReviews?.some(
                (review) => review.order.orderId === order.orderId && review.menuItem.menuItemId === item.menuItemId,
              ),
            )}
            onAnnounce={setAnnouncement}
          />
        ))}
      </div>
    </section>
  );
}
