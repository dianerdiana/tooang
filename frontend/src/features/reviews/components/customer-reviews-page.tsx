import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PencilIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LiveRegion } from '@/components/ui/live-region';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';

import { isApplicationError } from '@/utils/api-error.util';
import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';

import { useDeleteOwnReviewMutation, useUpdateOwnReviewMutation } from '../queries/reviews.mutation';
import { ownReviewsQueryOptions } from '../queries/reviews.query';
import {
  type OwnMenuItemReview,
  type OwnPlaceReview,
  type OwnReviewSearch,
  REVIEW_MODERATION_TAB,
  type ReviewUpdateInput,
} from '../types/reviews.type';

import { ReviewFormDialog } from './review-form-dialog';
import { StarRatingDisplay } from './star-rating-input';

type CustomerReview = OwnPlaceReview | OwnMenuItemReview;

const formatReviewDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

function CustomerReviewCard({
  review,
  tab,
  onAnnounce,
}: {
  review: CustomerReview;
  tab: OwnReviewSearch['tab'];
  onAnnounce: (message: string) => void;
}) {
  const updateMutation = useUpdateOwnReviewMutation();
  const deleteMutation = useDeleteOwnReviewMutation();
  const item = 'menuItem' in review ? review.menuItem : undefined;
  const targetName = item?.name ?? review.place.name;
  const context = {
    tab,
    reviewId: review.reviewId,
    placeId: review.place.placeId,
    orderId: review.order.orderId,
    ...(item ? { menuItemId: item.menuItemId } : {}),
  };

  const update = async (input: Required<Pick<ReviewUpdateInput, 'rating' | 'comment'>>) => {
    await updateMutation.mutateAsync({ ...context, input });
    onAnnounce(`Review for ${targetName} updated.`);
    toast.success('Review updated');
  };

  const remove = async () => {
    try {
      await deleteMutation.mutateAsync(context);
      onAnnounce(`Review for ${targetName} deleted.`);
      toast.success('Review deleted');
    } catch {
      // The safe presentation is rendered below and the dialog can be opened again.
    }
  };

  const deleteError = deleteMutation.error ? getCustomerErrorPresentation(deleteMutation.error) : undefined;

  return (
    <article className='rounded-surface border bg-surface p-4 shadow-sm sm:p-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h2 className='wrap-break-word font-semibold'>{targetName}</h2>
          {item && <p className='text-sm text-muted-foreground'>{review.place.name}</p>}
          <p className='mt-1 text-sm text-muted-foreground'>Order {review.order.orderCode}</p>
        </div>
        <StarRatingDisplay rating={review.rating} />
      </div>

      <p className='mt-4 whitespace-pre-wrap text-sm'>
        {review.comment || <span className='text-muted-foreground'>No comment provided.</span>}
      </p>

      <dl className='mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground'>
        <div className='flex gap-1'>
          <dt>Created</dt>
          <dd>
            <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
          </dd>
        </div>
        <div className='flex gap-1'>
          <dt>Updated</dt>
          <dd>
            <time dateTime={review.updatedAt}>{formatReviewDate(review.updatedAt)}</time>
          </dd>
        </div>
      </dl>

      {deleteError && (
        <CustomerAlert
          className='mt-4'
          tone={deleteError.tone === 'conflict' ? 'warning' : 'error'}
          title={deleteError.title}
          description={deleteError.description}
          live
        />
      )}

      <div className='mt-4 flex flex-wrap gap-2 border-t pt-4'>
        <ReviewFormDialog
          trigger={
            <Button type='button' variant='outline'>
              <PencilIcon aria-hidden /> Edit
            </Button>
          }
          title={`Edit review for ${targetName}`}
          description={`Update the feedback attached to order ${review.order.orderCode}.`}
          submitLabel='Save changes'
          initialRating={review.rating}
          initialComment={review.comment}
          pending={updateMutation.isPending}
          error={updateMutation.error}
          onOpenChange={(open) => {
            if (open) updateMutation.reset();
          }}
          onSubmit={update}
        />
        <ConfirmDialog
          title={`Delete review for ${targetName}?`}
          description='The review will no longer appear publicly. Your order history and purchase record will not be removed.'
          confirmLabel='Delete review'
          variant='destructive'
          isPending={deleteMutation.isPending}
          onOpenChange={(open) => {
            if (open) deleteMutation.reset();
          }}
          onConfirm={() => void remove()}
          trigger={
            <Button type='button' variant='outline'>
              <Trash2Icon aria-hidden /> Delete
            </Button>
          }
        />
      </div>
    </article>
  );
}

function ReviewListSkeleton() {
  return (
    <div className='grid gap-4' role='status' aria-label='Loading your reviews'>
      <Skeleton className='h-48 rounded-surface' />
      <Skeleton className='h-48 rounded-surface' />
    </div>
  );
}

export function CustomerReviewsPage({
  search,
  onSearchChange,
  recoveryNotice,
}: {
  search: OwnReviewSearch;
  onSearchChange: (search: OwnReviewSearch) => void;
  recoveryNotice?: React.ReactNode;
}) {
  const [announcement, setAnnouncement] = useState('');
  const query = useQuery(ownReviewsQueryOptions(search.tab, { page: search.page, limit: search.limit }));
  const reviews = query.data?.reviews ?? [];
  const error = query.error ? getCustomerErrorPresentation(query.error) : undefined;
  const signedOut = isApplicationError(query.error) && query.error.httpStatus === 401;

  return (
    <div className='mx-auto w-full max-w-5xl px-page py-6 sm:py-8'>
      <LiveRegion>{announcement}</LiveRegion>
      {recoveryNotice}
      <header>
        <p className='text-sm font-semibold text-primary'>Account</p>
        <h1 className='mt-1 text-2xl font-bold tracking-tight sm:text-3xl'>Your reviews</h1>
        <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>
          Manage feedback submitted from your completed purchases.
        </p>
      </header>

      <div className='mt-6 flex gap-2 border-b' role='tablist' aria-label='Review type'>
        {(
          [
            [REVIEW_MODERATION_TAB.PLACE, 'Places'],
            [REVIEW_MODERATION_TAB.MENU_ITEM, 'Menu items'],
          ] as const
        ).map(([tab, label]) => (
          <Button
            key={tab}
            type='button'
            role='tab'
            variant='ghost'
            aria-selected={search.tab === tab}
            className='min-h-11 rounded-b-none aria-selected:border-b-2 aria-selected:border-primary'
            onClick={() => onSearchChange({ ...search, tab, page: 1 })}
          >
            {label}
          </Button>
        ))}
      </div>

      <main className='mt-5'>
        {query.isPending ? (
          <ReviewListSkeleton />
        ) : query.isError && !query.data ? (
          <ErrorState
            title={error?.title ?? 'Could not load reviews'}
            description={error?.description ?? 'Try again.'}
            tone={error?.tone}
            onRetry={error?.action === 'retry' || error?.action === 'refresh' ? () => void query.refetch() : undefined}
            secondaryAction={
              signedOut ? (
                <Button variant='outline' asChild>
                  <Link to='/login' search={{ redirect: '/account/reviews' }}>
                    Sign in again
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {query.isError && error && (
              <CustomerAlert
                className='mb-4'
                tone={error.tone === 'conflict' ? 'warning' : 'error'}
                title={error.title}
                description={error.description}
              />
            )}
            {reviews.length === 0 ? (
              <EmptyState
                icon={StarIcon}
                title='No reviews yet'
                description='Reviews submitted from completed orders will appear here.'
              />
            ) : (
              <div className='grid gap-4 lg:grid-cols-2'>
                {reviews.map((review) => (
                  <CustomerReviewCard
                    key={review.reviewId}
                    review={review}
                    tab={search.tab}
                    onAnnounce={setAnnouncement}
                  />
                ))}
              </div>
            )}
            {query.data && (
              <Pagination
                className='mt-6'
                page={search.page}
                pageSize={search.limit}
                totalItems={query.data.meta.totalItems ?? 0}
                totalPages={query.data.meta.totalPages ?? 0}
                disabled={query.isFetching}
                onPageChange={(page) => onSearchChange({ ...search, page })}
                onPageSizeChange={(limit) => onSearchChange({ ...search, page: 1, limit })}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
