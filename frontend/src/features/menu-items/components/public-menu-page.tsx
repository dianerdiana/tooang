import { useEffect, useMemo, useRef } from 'react';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, UtensilsIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { PlaceOpenStateBadge, PlaceOrderingStateBadge } from '@/components/ui/customer-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LiveRegion } from '@/components/ui/live-region';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { Skeleton } from '@/components/ui/skeleton';

import { publicPlaceQueryOptions } from '@/features/places/queries/places.query';
import type { PublicPlaceDetail, PublicPlaceDiscoverySearch } from '@/features/places/types/places.type';

import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { formatCurrency } from '@/utils/format-currency';
import { cn } from '@/utils/utils';

import { publicMenuInfiniteQueryOptions } from '../queries/menu-items.query';
import type { MenuItemType, PublicMenuCategory, PublicMenuFilters, PublicMenuItem } from '../types/menu-items.type';

import { PublicMenuItemDetail } from './public-menu-item-detail';

const PUBLIC_MENU_PAGE_SIZE = 20;

type PublicMenuPageProps = {
  slug: string;
  discoverySearch: PublicPlaceDiscoverySearch;
  filters: PublicMenuFilters;
  onFiltersChange: (filters: PublicMenuFilters) => void;
};

const typeLabels: Record<MenuItemType, string> = { FOOD: 'Food', DRINK: 'Drinks' };

function collectPublicMenuCategories(pages: readonly { categories: PublicMenuCategory[] }[]) {
  const categories = new Map<string, Omit<PublicMenuCategory, 'items'>>();
  for (const page of pages) {
    for (const category of page.categories) {
      if (!categories.has(category.categoryId)) {
        categories.set(category.categoryId, {
          categoryId: category.categoryId,
          name: category.name,
          sortOrder: category.sortOrder,
          thumbnailUrl: category.thumbnailUrl,
        });
      }
    }
  }
  return [...categories.values()];
}

function collectPublicMenuItems(pages: readonly { categories: PublicMenuCategory[] }[]) {
  const seen = new Set<string>();
  const items: Array<PublicMenuItem & { categoryName: string }> = [];
  for (const page of pages) {
    for (const category of page.categories) {
      for (const item of category.items) {
        if (!seen.has(item.menuItemId)) {
          seen.add(item.menuItemId);
          items.push({ ...item, categoryName: category.name });
        }
      }
    }
  }
  return items;
}

function MenuFilterChip({ selected, ...props }: React.ComponentProps<'button'> & { selected: boolean }) {
  return (
    <button
      type='button'
      aria-pressed={selected}
      className={cn(
        'min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-surface text-foreground active:bg-surface-subtle',
      )}
      {...props}
    />
  );
}

function PublicMenuFiltersBar({
  categories,
  filters,
  onChange,
}: {
  categories: Array<Omit<PublicMenuCategory, 'items'>>;
  filters: PublicMenuFilters;
  onChange: (filters: PublicMenuFilters) => void;
}) {
  const selectedCategoryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    selectedCategoryRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [filters.categoryId]);

  return (
    <div className='sticky top-16 z-20 -mx-page border-y bg-background/95 px-page py-3 shadow-xs backdrop-blur-sm md:static md:mx-0 md:rounded-surface md:border md:bg-surface md:shadow-none'>
      <div className='flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible' aria-label='Menu filters'>
        <MenuFilterChip selected={!filters.type} onClick={() => onChange({})}>
          All items
        </MenuFilterChip>
        {(['FOOD', 'DRINK'] as const).map((type) => (
          <MenuFilterChip
            key={type}
            selected={filters.type === type && !filters.categoryId}
            onClick={() => onChange({ type })}
          >
            {typeLabels[type]}
          </MenuFilterChip>
        ))}
        {categories.map((category) => (
          <MenuFilterChip
            key={category.categoryId}
            ref={filters.categoryId === category.categoryId ? selectedCategoryRef : undefined}
            selected={filters.categoryId === category.categoryId}
            onClick={() => onChange({ ...filters, categoryId: category.categoryId })}
          >
            {category.name}
          </MenuFilterChip>
        ))}
      </div>
      <p className='mt-2 text-xs text-muted-foreground'>Categories appear as their items are loaded.</p>
    </div>
  );
}

function PublicMenuItemCard({
  item,
  placeId,
  orderingEnabled,
}: {
  item: PublicMenuItem & { categoryName: string };
  placeId: string;
  orderingEnabled: boolean;
}) {
  return (
    <article className='grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-3 rounded-surface border bg-surface p-3 shadow-xs sm:grid-cols-1 sm:p-0'>
      <ResponsiveImage
        src={item.imageUrl ?? undefined}
        alt={item.imageUrl ? item.name : ''}
        fallbackLabel='Image unavailable'
        className='size-24 rounded-lg sm:h-auto sm:w-full sm:rounded-b-none'
        loading='lazy'
      />
      <div className='flex min-w-0 flex-col sm:p-4 sm:pt-1'>
        <p className='text-xs font-semibold text-primary'>
          {item.categoryName} · {typeLabels[item.type]}
        </p>
        <h2 className='mt-1 wrap-break-word font-semibold leading-snug'>{item.name}</h2>
        <p className='mt-1 line-clamp-2 wrap-break-word text-sm text-muted-foreground'>
          {item.description || 'No description available.'}
        </p>
        <p className='mt-2 font-bold tabular-nums'>{formatCurrency(item.price)}</p>
        <div className='mt-3 sm:mt-auto sm:pt-4'>
          <PublicMenuItemDetail placeId={placeId} item={item} orderingEnabled={orderingEnabled} />
        </div>
      </div>
    </article>
  );
}

function PublicMenuSkeleton() {
  return (
    <div role='status' aria-label='Loading menu' className='space-y-5'>
      <div className='space-y-3'>
        <Skeleton className='h-7 w-2/3' />
        <Skeleton className='h-5 w-40' />
        <Skeleton className='h-11 w-full rounded-full' />
      </div>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className='grid grid-cols-[6rem_minmax(0,1fr)] gap-3 rounded-surface border p-3 sm:block'>
            <Skeleton className='size-24 rounded-lg sm:aspect-4/3 sm:size-auto sm:w-full' />
            <div className='space-y-3 sm:p-4'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-5 w-3/4' />
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuPlaceHeader({
  place,
  discoverySearch,
}: {
  place: PublicPlaceDetail;
  discoverySearch: PublicPlaceDiscoverySearch;
}) {
  return (
    <header className='space-y-4'>
      <Button variant='ghost' asChild className='-ml-3 min-h-11'>
        <Link to='/places/$slug' params={{ slug: place.slug }} search={discoverySearch}>
          <ArrowLeftIcon aria-hidden /> Back to place
        </Link>
      </Button>
      <div>
        <p className='text-sm font-semibold text-primary'>Menu at</p>
        <h1 className='mt-1 wrap-break-word text-3xl font-bold tracking-tight'>{place.name}</h1>
        {place.city && <p className='mt-1 wrap-break-word text-muted-foreground'>{place.city}</p>}
      </div>
      <div className='flex flex-wrap gap-2'>
        <PlaceOpenStateBadge state={place.isOpen ? 'OPEN' : 'CLOSED'} />
        <PlaceOrderingStateBadge enabled={place.isOrderingEnabled} />
      </div>
      {(!place.isOpen || !place.isOrderingEnabled) && (
        <CustomerAlert
          tone='warning'
          title='Menu browsing remains available'
          description={`${!place.isOpen ? 'This place is currently closed. ' : ''}${!place.isOrderingEnabled ? 'Online ordering is unavailable. ' : ''}You can still explore the menu.`}
        />
      )}
    </header>
  );
}

function PublicMenuResults({
  place,
  filters,
  onFiltersChange,
}: {
  place: PublicPlaceDetail;
  filters: PublicMenuFilters;
  onFiltersChange: (filters: PublicMenuFilters) => void;
}) {
  const menuQuery = useInfiniteQuery(
    publicMenuInfiniteQueryOptions(place.id, { ...filters, limit: PUBLIC_MENU_PAGE_SIZE }),
  );
  const pages = menuQuery.data?.pages ?? [];
  const categories = collectPublicMenuCategories(pages);
  const items = collectPublicMenuItems(pages);
  const summary = pages[0]?.meta;
  const errorPresentation = useMemo(() => getCustomerErrorPresentation(menuQuery.error), [menuQuery.error]);
  const hasFilters = Boolean(filters.type || filters.categoryId);

  if (menuQuery.isPending) return <PublicMenuSkeleton />;
  if (menuQuery.isError && !menuQuery.data) {
    return (
      <ErrorState
        title='Menu unavailable'
        description={errorPresentation.description}
        tone={errorPresentation.tone}
        onRetry={errorPresentation.action === 'retry' ? () => void menuQuery.refetch() : undefined}
        isRetrying={menuQuery.isFetching}
      />
    );
  }

  return (
    <div className='space-y-5'>
      <PublicMenuFiltersBar categories={categories} filters={filters} onChange={onFiltersChange} />

      {menuQuery.isFetching && !menuQuery.isFetchingNextPage && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground' role='status'>
          <span className='size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none' aria-hidden />
          Updating menu…
        </div>
      )}

      {menuQuery.isError && menuQuery.data && (
        <CustomerAlert
          tone='error'
          title={menuQuery.isFetchNextPageError ? 'More menu items could not be loaded' : 'Menu could not be refreshed'}
          description='The menu items already loaded are still available.'
          action={
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void (menuQuery.isFetchNextPageError ? menuQuery.fetchNextPage() : menuQuery.refetch())}
            >
              Try again
            </Button>
          }
        />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={UtensilsIcon}
          title={hasFilters ? 'No matching menu items' : 'No menu items available'}
          description={
            hasFilters
              ? 'Try another type or clear the selected category.'
              : 'This place has not published any available menu items yet.'
          }
          action={
            hasFilters ? (
              <Button type='button' variant='outline' onClick={() => onFiltersChange({})}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3' aria-label='Menu items'>
          {items.map((item) => (
            <PublicMenuItemCard
              key={item.menuItemId}
              placeId={place.id}
              item={item}
              orderingEnabled={place.isOrderingEnabled}
            />
          ))}
        </div>
      )}

      {menuQuery.hasNextPage && (
        <div className='flex justify-center'>
          <Button
            type='button'
            variant='outline'
            disabled={menuQuery.isFetchingNextPage}
            onClick={() => void menuQuery.fetchNextPage()}
          >
            {menuQuery.isFetchingNextPage ? 'Loading more…' : 'Load more items'}
          </Button>
        </div>
      )}
      <LiveRegion>
        {menuQuery.isFetchingNextPage
          ? 'Loading more menu items.'
          : `Showing ${items.length}${summary ? ` of ${summary.totalItems}` : ''} menu items.`}
      </LiveRegion>
      <div className='h-20' aria-hidden />
    </div>
  );
}

function PublicMenuPage({ slug, discoverySearch, filters, onFiltersChange }: PublicMenuPageProps) {
  const placeQuery = useQuery(publicPlaceQueryOptions(slug));
  const errorPresentation = useMemo(() => getCustomerErrorPresentation(placeQuery.error), [placeQuery.error]);

  if (placeQuery.isPending) {
    return (
      <div className='mx-auto w-full max-w-6xl px-page py-8'>
        <PublicMenuSkeleton />
      </div>
    );
  }
  if (placeQuery.isError && !placeQuery.data) {
    const notFound = errorPresentation.kind === 'not-found';
    return (
      <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
        <ErrorState
          className='w-full'
          title={notFound ? 'Place unavailable' : errorPresentation.title}
          description={
            notFound ? 'This place could not be found or is not available publicly.' : errorPresentation.description
          }
          tone={notFound ? 'not-found' : errorPresentation.tone}
          onRetry={!notFound && errorPresentation.action === 'retry' ? () => void placeQuery.refetch() : undefined}
          secondaryAction={
            <Button variant='outline' asChild>
              <Link to='/' search={discoverySearch}>
                Return to discovery
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return placeQuery.data ? (
    <main className='mx-auto w-full max-w-6xl space-y-6 px-page py-6 sm:py-8'>
      {placeQuery.isFetching && <LiveRegion>Updating place information.</LiveRegion>}
      <MenuPlaceHeader place={placeQuery.data} discoverySearch={discoverySearch} />
      <PublicMenuResults place={placeQuery.data} filters={filters} onFiltersChange={onFiltersChange} />
    </main>
  ) : null;
}

export {
  collectPublicMenuCategories,
  collectPublicMenuItems,
  MenuFilterChip,
  PublicMenuFiltersBar,
  PublicMenuItemCard,
  PublicMenuPage,
  type PublicMenuPageProps,
  PublicMenuSkeleton,
};
