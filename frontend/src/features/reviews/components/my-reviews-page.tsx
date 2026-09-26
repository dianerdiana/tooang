import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { PencilIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { getDashboardErrorPresentation, getDashboardErrorTone, getSafeMutationError } from '@/utils/dashboard-error';

import { useDeleteOwnReviewMutation, useUpdateOwnReviewMutation } from '../queries/reviews.mutation';
import { ownReviewsQueryOptions } from '../queries/reviews.query';
import { reviewUpdateSchema } from '../schemas/reviews.schema';
import { type OwnReviewBase, type OwnReviewSearch, REVIEW_MODERATION_TAB } from '../types/reviews.type';

function Stars({ rating }: { rating: number }) {
  return (
    <span className='text-warning' aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

function ReviewCard({
  review,
  tab,
}: {
  review: OwnReviewBase & { menuItem?: { name: string } };
  tab: 'place' | 'menu-item';
}) {
  const updateMutation = useUpdateOwnReviewMutation();
  const deleteMutation = useDeleteOwnReviewMutation();
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(String(review.rating));
  const [comment, setComment] = useState(review.comment ?? '');
  const [error, setError] = useState<string>();
  const save = async () => {
    const parsed = reviewUpdateSchema.safeParse({ rating: Number(rating), comment });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    try {
      await updateMutation.mutateAsync({ tab, reviewId: review.reviewId, input: parsed.data });
      setEditing(false);
      toast.success('Review updated.');
    } catch (mutationError) {
      setError(getSafeMutationError(mutationError, 'Unable to update this review.'));
    }
  };
  const remove = async () => {
    try {
      await deleteMutation.mutateAsync({ tab, reviewId: review.reviewId });
      toast.success('Review deleted.');
    } catch (mutationError) {
      setError(getSafeMutationError(mutationError, 'Unable to delete this review.'));
    }
  };

  return (
    <article className='rounded-lg border bg-surface p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-semibold'>{review.menuItem?.name ?? review.place.name}</h3>
          <p className='text-sm text-muted-foreground'>
            {review.place.name} · Order {review.order.orderCode}
          </p>
        </div>
        {!editing && <Stars rating={review.rating} />}
      </div>
      {editing ? (
        <div className='mt-4 grid gap-3'>
          <label className='grid gap-1 text-sm font-medium'>
            Rating
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} star{value === 1 ? '' : 's'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className='grid gap-1 text-sm font-medium'>
            Comment
            <textarea
              className='min-h-24 rounded-md border bg-background px-3 py-2 text-sm'
              maxLength={2000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <p className='mt-3 whitespace-pre-wrap text-sm'>
          {review.comment || <span className='text-muted-foreground'>No comment</span>}
        </p>
      )}
      {!editing && (
        <div className='mt-4 flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => setEditing(true)}>
            <PencilIcon />
            Edit
          </Button>
          <ConfirmDialog
            title='Delete this review?'
            description='This removes the review from public view.'
            confirmLabel='Delete review'
            variant='destructive'
            isPending={deleteMutation.isPending}
            onConfirm={() => void remove()}
            trigger={
              <Button variant='outline' size='sm'>
                <Trash2Icon />
                Delete
              </Button>
            }
          />
        </div>
      )}
      {error && (
        <p role='alert' className='mt-3 text-sm text-destructive'>
          {error}
        </p>
      )}
    </article>
  );
}

export function MyReviewsPage({
  search,
  onSearchChange,
}: {
  search: OwnReviewSearch;
  onSearchChange: (search: OwnReviewSearch) => void;
}) {
  const query = useQuery(ownReviewsQueryOptions(search.tab, { page: search.page, limit: search.limit }));
  const error = getDashboardErrorPresentation(query.error);
  const reviews = query.data?.reviews ?? [];
  return (
    <>
      <PageHeader title='My reviews' description='Update or remove reviews you have shared.' />
      <div className='flex gap-2' role='tablist'>
        <Button
          variant={search.tab === REVIEW_MODERATION_TAB.PLACE ? 'default' : 'outline'}
          onClick={() => onSearchChange({ ...search, tab: REVIEW_MODERATION_TAB.PLACE, page: 1 })}
        >
          Places
        </Button>
        <Button
          variant={search.tab === REVIEW_MODERATION_TAB.MENU_ITEM ? 'default' : 'outline'}
          onClick={() => onSearchChange({ ...search, tab: REVIEW_MODERATION_TAB.MENU_ITEM, page: 1 })}
        >
          Menu items
        </Button>
      </div>
      <SectionCard>
        <div className='space-y-4'>
          {query.isPending ? (
            <p className='py-10 text-center text-sm text-muted-foreground'>Loading your reviews…</p>
          ) : query.isError && !query.data ? (
            <ErrorState
              title={error.title}
              description={error.description}
              tone={getDashboardErrorTone(error.kind)}
              onRetry={() => void query.refetch()}
            />
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={StarIcon}
              title='No reviews yet'
              description='Reviews you submit after completed orders will appear here.'
            />
          ) : (
            reviews.map((review) => <ReviewCard key={review.reviewId} review={review} tab={search.tab} />)
          )}
          {query.data && (
            <Pagination
              page={search.page}
              pageSize={search.limit}
              totalItems={query.data.meta.totalItems ?? 0}
              totalPages={query.data.meta.totalPages ?? 0}
              disabled={query.isFetching}
              onPageChange={(page) => onSearchChange({ ...search, page })}
              onPageSizeChange={(limit) => onSearchChange({ ...search, page: 1, limit })}
            />
          )}
        </div>
      </SectionCard>
    </>
  );
}
