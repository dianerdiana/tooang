import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CheckCircle2Icon, MessageSquareTextIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LiveRegion } from '@/components/ui/live-region';
import { RatingDisplay } from '@/components/ui/rating';
import { Skeleton } from '@/components/ui/skeleton';

import { ProtectedActionLoginLink } from '@/features/auth/components/protected-action-login-link';

import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { useAuth } from '@/utils/hooks/use-auth';

import { publicPlaceReviewsInfiniteQueryOptions } from '../queries/reviews.query';
import { PUBLIC_PLACE_REVIEWS_PAGE_SIZE } from '../schemas/reviews.schema';
import type { PublicPlaceReview, PublicReviewSummary } from '../types/reviews.type';

type PublicPlaceReviewsSectionProps = {
  placeId: string;
  placeSlug: string;
};

function deduplicatePublicReviews(reviews: readonly PublicPlaceReview[]) {
  const seen = new Set<string>();
  return reviews.filter((review) => {
    if (seen.has(review.reviewId)) return false;
    seen.add(review.reviewId);
    return true;
  });
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function PublicReviewCard({ review }: { review: PublicPlaceReview }) {
  return (
    <article className='min-w-0 rounded-lg border bg-surface p-4 shadow-xs'>
      <div className='flex min-w-0 flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='wrap-break-word font-semibold'>{review.reviewer.fullName}</h3>
          <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <CheckCircle2Icon className='size-3.5 text-success' aria-hidden />
            Verified purchase
          </p>
        </div>
        <time className='shrink-0 text-xs text-muted-foreground' dateTime={review.createdAt}>
          {formatReviewDate(review.createdAt)}
        </time>
      </div>
      <RatingDisplay value={review.rating} className='mt-3' label={`Rating by ${review.reviewer.fullName}`} />
      {review.comment && (
        <p className='mt-3 wrap-break-word whitespace-pre-line text-sm text-foreground'>{review.comment}</p>
      )}
    </article>
  );
}

function PublicReviewSummaryView({ summary }: { summary: PublicReviewSummary }) {
  return (
    <div className='rounded-lg bg-surface-subtle p-4'>
      <p className='text-sm font-medium'>Customer rating</p>
      {summary.averageRating === null ? (
        <p className='mt-2 text-sm text-muted-foreground'>No rating yet</p>
      ) : (
        <RatingDisplay value={summary.averageRating} reviewCount={summary.reviewCount} className='mt-2' />
      )}
    </div>
  );
}

function ReviewEligibilityGuidance({
  isAuthenticated,
  placeId,
  placeSlug,
}: {
  isAuthenticated: boolean;
  placeId: string;
  placeSlug: string;
}) {
  return (
    <CustomerAlert
      tone='info'
      title='Reviews come from completed orders'
      description={
        isAuthenticated
          ? 'Review actions appear with eligible completed orders in your order history.'
          : 'Sign in and open your order history to review an eligible completed purchase.'
      }
      action={
        <Button variant='outline' size='sm' asChild>
          {isAuthenticated ? (
            <Link to='/orders'>View your orders</Link>
          ) : (
            <ProtectedActionLoginLink
              intent={{ kind: 'review', payload: { placeId, placeSlug, target: 'place' }, returnTo: '/orders' }}
            >
              Sign in
            </ProtectedActionLoginLink>
          )}
        </Button>
      }
    />
  );
}

function PublicReviewsSkeleton() {
  return (
    <div role='status' aria-label='Loading reviews' className='space-y-4'>
      <Skeleton className='h-24 w-full rounded-lg' />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className='space-y-3 rounded-lg border p-4'>
          <Skeleton className='h-5 w-40' />
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-16 w-full' />
        </div>
      ))}
    </div>
  );
}

function PublicPlaceReviewsSection({ placeId, placeSlug }: PublicPlaceReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const reviewsQuery = useInfiniteQuery(
    publicPlaceReviewsInfiniteQueryOptions(placeId, PUBLIC_PLACE_REVIEWS_PAGE_SIZE),
  );
  const errorPresentation = getCustomerErrorPresentation(reviewsQuery.error);
  const pages = reviewsQuery.data?.pages ?? [];
  const reviews = deduplicatePublicReviews(pages.flatMap((page) => page.reviews));
  const summary = pages[0]?.summary;

  return (
    <Card id='reviews' aria-labelledby='place-reviews-heading' className='scroll-mt-24'>
      <CardHeader>
        <CardTitle id='place-reviews-heading'>Reviews</CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {reviewsQuery.isPending ? (
          <PublicReviewsSkeleton />
        ) : reviewsQuery.isError && !reviewsQuery.data ? (
          <ErrorState
            compact
            title='Reviews unavailable'
            description={errorPresentation.description}
            tone={errorPresentation.tone}
            onRetry={errorPresentation.action === 'retry' ? () => void reviewsQuery.refetch() : undefined}
            isRetrying={reviewsQuery.isFetching}
          />
        ) : summary ? (
          <>
            <PublicReviewSummaryView summary={summary} />

            {reviewsQuery.isError && reviewsQuery.data && (
              <CustomerAlert
                tone='error'
                title={
                  reviewsQuery.isFetchNextPageError
                    ? 'More reviews could not be loaded'
                    : 'Reviews could not be refreshed'
                }
                description='The reviews already loaded are still available.'
                action={
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={reviewsQuery.isFetching}
                    onClick={() =>
                      void (reviewsQuery.isFetchNextPageError ? reviewsQuery.fetchNextPage() : reviewsQuery.refetch())
                    }
                  >
                    Try again
                  </Button>
                }
              />
            )}

            {summary.reviewCount === 0 && reviews.length === 0 ? (
              <EmptyState
                compact
                icon={MessageSquareTextIcon}
                title='No reviews yet'
                description='Verified-purchase reviews will appear here.'
              />
            ) : (
              <div className='space-y-3' aria-label='Place reviews'>
                {reviews.map((review) => (
                  <PublicReviewCard key={review.reviewId} review={review} />
                ))}
              </div>
            )}

            {reviewsQuery.hasNextPage && (
              <div className='flex justify-center'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={reviewsQuery.isFetchingNextPage}
                  onClick={() => void reviewsQuery.fetchNextPage()}
                >
                  {reviewsQuery.isFetchingNextPage ? 'Loading more…' : 'Load more reviews'}
                </Button>
              </div>
            )}

            <LiveRegion>
              {reviewsQuery.isFetchingNextPage
                ? 'Loading more reviews.'
                : `Showing ${reviews.length} of ${summary.reviewCount} reviews.`}
            </LiveRegion>
          </>
        ) : null}

        <ReviewEligibilityGuidance isAuthenticated={isAuthenticated} placeId={placeId} placeSlug={placeSlug} />
      </CardContent>
    </Card>
  );
}

export {
  deduplicatePublicReviews,
  formatReviewDate,
  PublicPlaceReviewsSection,
  type PublicPlaceReviewsSectionProps,
  PublicReviewCard,
  PublicReviewsSkeleton,
  PublicReviewSummaryView,
  ReviewEligibilityGuidance,
};
