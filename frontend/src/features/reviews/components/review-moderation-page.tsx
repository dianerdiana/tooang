import { type FormEvent, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { MessageSquareWarningIcon, SearchIcon, StarIcon, Trash2Icon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { menuItemsQueryOptions } from '@/features/menu-items/queries/menu-items.query';
import { managementPlacesQueryOptions } from '@/features/places/queries/places.query';

import { isApplicationError } from '@/utils/api-error.util';

import { useModerateReviewMutation } from '../queries/reviews.mutation';
import { menuItemModerationReviewsQueryOptions, placeModerationReviewsQueryOptions } from '../queries/reviews.query';
import {
  type MenuItemModerationReview,
  type PlaceModerationReview,
  REVIEW_MODERATION_TAB,
  type ReviewModerationSearch,
  type ReviewModerationTab,
} from '../types/reviews.type';

type ReviewModerationPageProps = {
  filters: ReviewModerationSearch;
  onFiltersChange: (filters: ReviewModerationSearch) => void;
};

type ModerationReview = PlaceModerationReview | MenuItemModerationReview;

type ReviewResultsProps = {
  reviews: ModerationReview[];
  tab: ReviewModerationTab;
  pendingReviewId?: string;
  failedReviewId?: string;
  mutationError?: unknown;
  onModerate: (review: ModerationReview) => void;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const moderationErrorMessage = (error: unknown) => {
  if (!isApplicationError(error)) return 'Unable to moderate this review. Please try again.';
  if (error.httpStatus === 403) return error.message || 'You no longer have permission to moderate reviews.';
  if (error.httpStatus === 404) return 'This active review no longer exists. Refresh the list and try again.';
  if (error.isNetworkError) return 'Could not reach the server. Check your connection and try again.';
  return error.message || 'Unable to moderate this review. Please try again.';
};

function Rating({ value }: { value: number }) {
  return (
    <span className='inline-flex items-center gap-1 font-medium' aria-label={`${value} out of 5 stars`}>
      <StarIcon className='size-4 fill-warning text-warning' aria-hidden />
      {value}/5
    </span>
  );
}

function ReviewTarget({ review, tab }: { review: ModerationReview; tab: ReviewModerationTab }) {
  return (
    <div className='space-y-1'>
      <StatusBadge tone={tab === REVIEW_MODERATION_TAB.PLACE ? 'primary' : 'warning'}>
        {tab === REVIEW_MODERATION_TAB.PLACE ? 'Place review' : 'Menu item review'}
      </StatusBadge>
      <p className='font-medium'>{review.place.name}</p>
      <p className='text-xs text-muted-foreground'>{review.place.placeId}</p>
      {'menuItem' in review && (
        <>
          <p className='text-sm'>{review.menuItem.name}</p>
          <p className='text-xs text-muted-foreground'>{review.menuItem.menuItemId}</p>
        </>
      )}
    </div>
  );
}

function ModerateReviewAction({
  review,
  tab,
  isPending,
  error,
  onModerate,
}: {
  review: ModerationReview;
  tab: ReviewModerationTab;
  isPending: boolean;
  error?: unknown;
  onModerate: (review: ModerationReview) => void;
}) {
  const target = 'menuItem' in review ? `${review.menuItem.name} at ${review.place.name}` : review.place.name;
  return (
    <div className='space-y-2'>
      <ConfirmDialog
        title='Remove this review?'
        description={`Remove ${review.reviewer.fullName}'s ${review.rating}-star review of ${target}? This moderation action is audited.`}
        confirmLabel='Remove review'
        variant='destructive'
        isPending={isPending}
        onConfirm={() => onModerate(review)}
        trigger={
          <Button type='button' variant='outline' size='sm' disabled={isPending}>
            <Trash2Icon aria-hidden />
            {isPending ? 'Removing…' : 'Remove'}
          </Button>
        }
      />
      {error !== undefined && (
        <p role='alert' className='max-w-72 text-sm text-destructive'>
          {moderationErrorMessage(error)}
        </p>
      )}
      <span className='sr-only'>Moderation type: {tab}</span>
    </div>
  );
}

function ReviewCards(props: ReviewResultsProps) {
  return (
    <div className='space-y-3 md:hidden' aria-label='Reviews'>
      {props.reviews.map((review) => (
        <article key={review.reviewId} className='space-y-4 rounded-surface border bg-surface p-4 shadow-xs'>
          <ReviewTarget review={review} tab={props.tab} />
          <div className='flex items-center justify-between gap-3'>
            <Rating value={review.rating} />
            <time className='text-sm text-muted-foreground' dateTime={review.createdAt}>
              {formatDateTime(review.createdAt)}
            </time>
          </div>
          <p className='whitespace-pre-wrap text-sm'>{review.comment ?? 'No comment provided.'}</p>
          <div className='text-sm'>
            <p className='font-medium'>{review.reviewer.fullName}</p>
            <p className='text-xs text-muted-foreground'>{review.reviewer.userId}</p>
          </div>
          <ModerateReviewAction
            review={review}
            tab={props.tab}
            isPending={props.pendingReviewId === review.reviewId}
            error={props.failedReviewId === review.reviewId ? props.mutationError : undefined}
            onModerate={props.onModerate}
          />
        </article>
      ))}
    </div>
  );
}

function ReviewsTable(props: ReviewResultsProps) {
  return (
    <div className='hidden overflow-hidden rounded-surface border bg-table shadow-xs md:block'>
      <Table aria-label='Reviews'>
        <TableHeader>
          <TableRow>
            <TableHead>Target</TableHead>
            <TableHead>Review</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.reviews.map((review) => (
            <TableRow key={review.reviewId}>
              <TableCell>
                <ReviewTarget review={review} tab={props.tab} />
              </TableCell>
              <TableCell className='max-w-md'>
                <Rating value={review.rating} />
                <p className='mt-2 line-clamp-4 whitespace-pre-wrap text-sm'>
                  {review.comment ?? 'No comment provided.'}
                </p>
              </TableCell>
              <TableCell>
                <span className='block font-medium'>{review.reviewer.fullName}</span>
                <span className='block text-xs text-muted-foreground'>{review.reviewer.userId}</span>
              </TableCell>
              <TableCell>
                <time dateTime={review.createdAt}>{formatDateTime(review.createdAt)}</time>
                <span className='block text-xs text-muted-foreground'>Updated {formatDateTime(review.updatedAt)}</span>
              </TableCell>
              <TableCell>
                <ModerateReviewAction
                  review={review}
                  tab={props.tab}
                  isPending={props.pendingReviewId === review.reviewId}
                  error={props.failedReviewId === review.reviewId ? props.mutationError : undefined}
                  onModerate={props.onModerate}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReviewsLoading() {
  return (
    <div role='status' aria-label='Loading reviews' className='space-y-3'>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className='h-36 w-full md:h-24' />
      ))}
    </div>
  );
}

function ReviewModerationPage({ filters, onFiltersChange }: ReviewModerationPageProps) {
  const [placeSearch, setPlaceSearch] = useState('');
  const [appliedPlaceSearch, setAppliedPlaceSearch] = useState('');
  const [mutationReviewId, setMutationReviewId] = useState<string>();
  const isPlaceTab = filters.tab === REVIEW_MODERATION_TAB.PLACE;
  const params = {
    page: filters.page,
    limit: filters.limit,
    placeId: filters.placeId,
    ...(!isPlaceTab && filters.menuItemId ? { menuItemId: filters.menuItemId } : {}),
  };
  const placeReviewsQuery = useQuery({ ...placeModerationReviewsQueryOptions(params), enabled: isPlaceTab });
  const itemReviewsQuery = useQuery({ ...menuItemModerationReviewsQueryOptions(params), enabled: !isPlaceTab });
  const reviewsQuery = isPlaceTab ? placeReviewsQuery : itemReviewsQuery;
  const placesQuery = useQuery(
    managementPlacesQueryOptions({ page: 1, limit: 100, search: appliedPlaceSearch || undefined }),
  );
  const menuItemsQuery = useQuery({
    ...menuItemsQueryOptions(filters.placeId ?? '', { page: 1, limit: 100 }),
    enabled: !isPlaceTab && Boolean(filters.placeId),
  });
  const mutation = useModerateReviewMutation();

  const update = (patch: Partial<ReviewModerationSearch>) =>
    onFiltersChange({ ...filters, ...patch, page: patch.page ?? 1 });

  const changeTab = (tab: ReviewModerationTab) =>
    onFiltersChange({
      tab,
      page: 1,
      limit: filters.limit,
      ...(filters.placeId ? { placeId: filters.placeId } : {}),
    });

  const moderate = async (review: ModerationReview) => {
    setMutationReviewId(review.reviewId);
    try {
      await mutation.mutateAsync({ tab: filters.tab, reviewId: review.reviewId });
      setMutationReviewId(undefined);
      toast.success('Review removed from the platform.');
    } catch {
      // The normalized error is rendered beside the affected review.
    }
  };

  const reviews = (reviewsQuery.data?.reviews ?? []) as ModerationReview[];
  const meta = reviewsQuery.data?.meta;
  const hasFilters = Boolean(filters.placeId || filters.menuItemId);
  const selectedPlaceMissing = Boolean(
    filters.placeId && !placesQuery.data?.places.some((place) => place.id === filters.placeId),
  );
  const selectedItemMissing = Boolean(
    filters.menuItemId && !menuItemsQuery.data?.items.some((item) => item.menuItemId === filters.menuItemId),
  );
  const listError = isApplicationError(reviewsQuery.error)
    ? reviewsQuery.error.message
    : 'The moderation review list is unavailable. Please try again.';
  const resultProps: ReviewResultsProps = {
    reviews,
    tab: filters.tab,
    pendingReviewId: mutation.isPending ? mutationReviewId : undefined,
    failedReviewId: mutation.isError ? mutationReviewId : undefined,
    mutationError: mutation.error,
    onModerate: (review) => void moderate(review),
  };

  const submitPlaceSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedPlaceSearch(placeSearch.trim());
  };

  return (
    <>
      <PageHeader title='Review moderation' description='Inspect and remove reviews across the Tooang platform.' />

      <SectionCard title='Review type' description='Place and menu-item reviews use separate backend resources.'>
        <div role='tablist' aria-label='Review type' className='flex flex-wrap gap-2'>
          <Button
            type='button'
            role='tab'
            aria-selected={isPlaceTab}
            variant={isPlaceTab ? 'default' : 'outline'}
            onClick={() => changeTab(REVIEW_MODERATION_TAB.PLACE)}
          >
            Place reviews
          </Button>
          <Button
            type='button'
            role='tab'
            aria-selected={!isPlaceTab}
            variant={!isPlaceTab ? 'default' : 'outline'}
            onClick={() => changeTab(REVIEW_MODERATION_TAB.MENU_ITEM)}
          >
            Menu item reviews
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title='Context filters'
        description='Filters are optional; lists initially include every active review.'
      >
        <div className='space-y-4'>
          <form onSubmit={submitPlaceSearch} className='flex max-w-xl gap-2'>
            <Input
              value={placeSearch}
              onChange={(event) => setPlaceSearch(event.target.value)}
              maxLength={120}
              placeholder='Search places by name or city'
              aria-label='Search places'
            />
            <Button type='submit' variant='outline' disabled={placesQuery.isFetching}>
              <SearchIcon aria-hidden />
              Search
            </Button>
          </form>
          <div className='grid gap-3 md:grid-cols-2'>
            <div className='space-y-1.5'>
              <label htmlFor='review-place-filter' className='text-sm font-medium'>
                Place
              </label>
              <Select
                value={filters.placeId ?? 'ALL'}
                onValueChange={(value) =>
                  update({ placeId: value === 'ALL' ? undefined : value, menuItemId: undefined })
                }
              >
                <SelectTrigger id='review-place-filter' className='w-full'>
                  <SelectValue placeholder={placesQuery.isFetching ? 'Loading places…' : 'All places'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>All places</SelectItem>
                  {selectedPlaceMissing && filters.placeId && (
                    <SelectItem value={filters.placeId}>Selected place ({filters.placeId})</SelectItem>
                  )}
                  {(placesQuery.data?.places ?? []).map((place) => (
                    <SelectItem key={place.id} value={place.id}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isPlaceTab && (
              <div className='space-y-1.5'>
                <label htmlFor='review-item-filter' className='text-sm font-medium'>
                  Menu item
                </label>
                <Select
                  value={filters.menuItemId ?? 'ALL'}
                  disabled={!filters.placeId || menuItemsQuery.isFetching}
                  onValueChange={(value) => update({ menuItemId: value === 'ALL' ? undefined : value })}
                >
                  <SelectTrigger id='review-item-filter' className='w-full'>
                    <SelectValue placeholder={filters.placeId ? 'All menu items' : 'Select a place first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>All menu items</SelectItem>
                    {selectedItemMissing && filters.menuItemId && (
                      <SelectItem value={filters.menuItemId}>Selected item ({filters.menuItemId})</SelectItem>
                    )}
                    {(menuItemsQuery.data?.items ?? []).map((item) => (
                      <SelectItem key={item.menuItemId} value={item.menuItemId}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {hasFilters && (
            <Button
              type='button'
              variant='ghost'
              onClick={() => onFiltersChange({ tab: filters.tab, page: 1, limit: filters.limit })}
            >
              <XIcon aria-hidden />
              Clear context filters
            </Button>
          )}
          {placesQuery.isError && (
            <p role='alert' className='text-sm text-destructive'>
              Place options could not be loaded. The review list remains available without this filter.
            </p>
          )}
          {menuItemsQuery.isError && (
            <p role='alert' className='text-sm text-destructive'>
              Menu-item options could not be loaded. Clear the item filter or retry the place selection.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={isPlaceTab ? 'Place reviews' : 'Menu item reviews'}
        description='Active reviews are shown newest first, including targets that are not publicly available.'
      >
        <div className='space-y-4'>
          {reviewsQuery.isPending ? (
            <ReviewsLoading />
          ) : reviewsQuery.isError && !reviewsQuery.data ? (
            <ErrorState
              title='Could not load reviews'
              description={listError}
              onRetry={() => void reviewsQuery.refetch()}
              isRetrying={reviewsQuery.isFetching}
            />
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={hasFilters ? SearchIcon : MessageSquareWarningIcon}
              title={hasFilters ? 'No reviews match this context' : 'No active reviews'}
              description={
                hasFilters
                  ? 'Clear or change the place and menu-item filters.'
                  : 'Active reviews of this type will appear here.'
              }
            />
          ) : (
            <>
              <ReviewCards {...resultProps} />
              <ReviewsTable {...resultProps} />
            </>
          )}

          {!reviewsQuery.isPending && reviewsQuery.data && (
            <Pagination
              page={filters.page}
              pageSize={filters.limit}
              totalItems={meta?.totalItems ?? 0}
              totalPages={meta?.totalPages ?? 0}
              disabled={reviewsQuery.isFetching || mutation.isPending}
              onPageChange={(page) => update({ page })}
              onPageSizeChange={(limit) => update({ page: 1, limit })}
            />
          )}
        </div>
      </SectionCard>
    </>
  );
}

export { moderationErrorMessage, ReviewCards, ReviewModerationPage, type ReviewModerationPageProps, ReviewsTable };
