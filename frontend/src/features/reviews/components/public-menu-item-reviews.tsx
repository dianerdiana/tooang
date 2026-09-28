import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageSquareTextIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LiveRegion } from '@/components/ui/live-region';

import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';

import { publicMenuItemReviewsInfiniteQueryOptions } from '../queries/reviews.query';

import {
  deduplicatePublicReviews,
  PublicReviewCard,
  PublicReviewsSkeleton,
  PublicReviewSummaryView,
} from './public-place-reviews-section';

type PublicMenuItemReviewsProps = { placeId: string; menuItemId: string };

function PublicMenuItemReviews({ placeId, menuItemId }: PublicMenuItemReviewsProps) {
  const query = useInfiniteQuery(publicMenuItemReviewsInfiniteQueryOptions(placeId, menuItemId, 10));
  const pages = query.data?.pages ?? [];
  const reviews = deduplicatePublicReviews(pages.flatMap((page) => page.reviews));
  const summary = pages[0]?.summary;
  const errorPresentation = getCustomerErrorPresentation(query.error);

  if (query.isPending) return <PublicReviewsSkeleton />;
  if (query.isError && !query.data) {
    return (
      <ErrorState
        compact
        title='Item reviews unavailable'
        description={errorPresentation.description}
        tone={errorPresentation.tone}
        onRetry={errorPresentation.action === 'retry' ? () => void query.refetch() : undefined}
        isRetrying={query.isFetching}
      />
    );
  }

  if (!summary) return null;
  return (
    <div className='space-y-4'>
      <PublicReviewSummaryView summary={summary} />
      {query.isError && query.data && (
        <CustomerAlert
          tone='error'
          title={query.isFetchNextPageError ? 'More reviews could not be loaded' : 'Reviews could not be refreshed'}
          description='Reviews already loaded remain available.'
          action={
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
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
          title='No item reviews yet'
          description='Verified-purchase reviews for this item will appear here.'
        />
      ) : (
        <div className='space-y-3' aria-label='Item reviews'>
          {reviews.map((review) => (
            <PublicReviewCard key={review.reviewId} review={review} />
          ))}
        </div>
      )}
      {query.hasNextPage && (
        <Button
          type='button'
          variant='outline'
          className='w-full'
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading more…' : 'Load more reviews'}
        </Button>
      )}
      <LiveRegion>
        {query.isFetchingNextPage
          ? 'Loading more item reviews.'
          : `Showing ${reviews.length} of ${summary.reviewCount} item reviews.`}
      </LiveRegion>
    </div>
  );
}

export { PublicMenuItemReviews, type PublicMenuItemReviewsProps };
