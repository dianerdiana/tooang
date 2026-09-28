import { type FormEvent, useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Building2Icon, FilterIcon, MapPinIcon, SearchIcon, XIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { publicPlacesQueryOptions } from '@/features/places/queries/places.query';
import { publicDiscoveryToListParams } from '@/features/places/schemas/places.schema';
import {
  PLACE_TYPE,
  type PlaceType,
  type PublicPlaceDiscoverySearch,
  type PublicPlaceListItem,
  type PublicPlacePaginationMeta,
} from '@/features/places/types/places.type';

import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { useDebounce } from '@/utils/hooks/use-debounce';

type DiscoveryNavigationOptions = { replace?: boolean };

type PublicPlaceDiscoveryPageProps = {
  filters: PublicPlaceDiscoverySearch;
  onFiltersChange: (filters: PublicPlaceDiscoverySearch, options?: DiscoveryNavigationOptions) => void;
};

const placeTypeLabels: Record<PlaceType, string> = {
  RESTAURANT: 'Restaurant',
  CAFE: 'Cafe',
  FOOD_STALL: 'Food stall',
  OTHER: 'Other',
};

function compactDiscoverySearch(filters: PublicPlaceDiscoverySearch): PublicPlaceDiscoverySearch {
  return {
    page: filters.page,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.city ? { city: filters.city } : {}),
  };
}

function nextDiscoveryFilters(
  current: PublicPlaceDiscoverySearch,
  next: Partial<PublicPlaceDiscoverySearch>,
): PublicPlaceDiscoverySearch {
  return compactDiscoverySearch({
    ...current,
    ...next,
    page: next.page ?? 1,
  });
}

function getPlaceCardMedia(place: PublicPlaceListItem) {
  if (place.coverUrl) return { src: place.coverUrl, fit: 'cover' as const, kind: 'cover' as const };
  if (place.logoUrl) return { src: place.logoUrl, fit: 'contain' as const, kind: 'logo' as const };
  return { src: undefined, fit: 'cover' as const, kind: 'fallback' as const };
}

function getResultRange(meta: PublicPlacePaginationMeta) {
  if (meta.totalItems === 0) return 'No places';
  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.totalItems);
  return `${first}–${last} of ${meta.totalItems} places`;
}

function DiscoveryFilters({
  city,
  idPrefix,
  type,
  onCityChange,
  onTypeChange,
}: {
  city: string;
  idPrefix: string;
  type?: PlaceType;
  onCityChange: (city: string) => void;
  onTypeChange: (type?: PlaceType) => void;
}) {
  return (
    <>
      <div className='space-y-1.5'>
        <label htmlFor={`${idPrefix}-type`} className='text-sm font-medium'>
          Place type
        </label>
        <Select
          value={type ?? 'ALL'}
          onValueChange={(value) => onTypeChange(value === 'ALL' ? undefined : (value as PlaceType))}
        >
          <SelectTrigger id={`${idPrefix}-type`} className='h-12 w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>All types</SelectItem>
            {Object.values(PLACE_TYPE).map((placeType) => (
              <SelectItem key={placeType} value={placeType}>
                {placeTypeLabels[placeType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-1.5'>
        <label htmlFor={`${idPrefix}-city`} className='text-sm font-medium'>
          City
        </label>
        <Input
          id={`${idPrefix}-city`}
          value={city}
          maxLength={100}
          placeholder='Exact city name'
          onChange={(event) => onCityChange(event.target.value)}
        />
      </div>
    </>
  );
}

function PlaceCard({ place, filters }: { place: PublicPlaceListItem; filters: PublicPlaceDiscoverySearch }) {
  const media = getPlaceCardMedia(place);
  return (
    <article className='group flex min-w-0 flex-col overflow-hidden rounded-surface border bg-surface shadow-xs focus-within:ring-2 focus-within:ring-ring'>
      <ResponsiveImage
        src={media.src}
        fit={media.fit}
        alt={media.kind === 'logo' ? `${place.name} logo` : media.kind === 'cover' ? `${place.name} cover` : ''}
        fallbackLabel={`${place.name} image unavailable`}
        className='rounded-none border-b'
        loading='lazy'
      />
      <div className='flex min-w-0 flex-1 flex-col p-4'>
        <Badge variant='secondary'>{placeTypeLabels[place.type]}</Badge>
        <h2 className='mt-3 min-w-0 text-lg font-semibold'>
          <Link
            to='/places/$slug'
            params={{ slug: place.slug }}
            search={filters}
            title={place.name}
            className='flex min-h-11 items-center break-words rounded-sm focus-visible:outline-none'
          >
            {place.name}
          </Link>
        </h2>
        <p className='mt-auto flex min-w-0 items-start gap-2 pt-3 text-sm text-muted-foreground'>
          <MapPinIcon className='mt-0.5 size-4 shrink-0' aria-hidden />
          <span className='min-w-0 break-words' title={[place.city, place.address].filter(Boolean).join(', ')}>
            {place.city ? `${place.city} · ` : ''}
            {place.address}
          </span>
        </p>
      </div>
    </article>
  );
}

function PlaceGrid({ places, filters }: { places: PublicPlaceListItem[]; filters: PublicPlaceDiscoverySearch }) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' aria-label='Published places'>
      {places.map((place) => (
        <PlaceCard key={place.id} place={place} filters={filters} />
      ))}
    </div>
  );
}

function DiscoverySkeleton() {
  return (
    <div
      role='status'
      aria-label='Loading places'
      className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className='overflow-hidden rounded-surface border bg-surface'>
          <Skeleton className='aspect-[4/3] w-full rounded-none' />
          <div className='space-y-3 p-4'>
            <Skeleton className='h-5 w-20' />
            <Skeleton className='h-6 w-3/4' />
            <Skeleton className='h-4 w-full' />
          </div>
        </div>
      ))}
    </div>
  );
}

function PublicPlaceDiscoveryPage({ filters, onFiltersChange }: PublicPlaceDiscoveryPageProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [desktopCity, setDesktopCity] = useState(filters.city ?? '');
  const [mobileCity, setMobileCity] = useState(filters.city ?? '');
  const [mobileType, setMobileType] = useState<PlaceType | undefined>(filters.type);
  const [sheetOpen, setSheetOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);
  const focusResultsAfterLoadRef = useRef(false);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const queryParams = publicDiscoveryToListParams(filters);
  const placesQuery = useQuery(publicPlacesQueryOptions(queryParams));
  const hasFilters = Boolean(filters.search || filters.type || filters.city);
  const activeFilterCount = Number(Boolean(filters.type)) + Number(Boolean(filters.city));
  const places = placesQuery.data?.places ?? [];
  const meta = placesQuery.data?.meta;
  const correctingPage = Boolean(meta && meta.totalItems > 0 && filters.page > Math.max(1, meta.totalPages));

  useEffect(() => {
    const normalizedSearch = debouncedSearch.trim() || undefined;
    if (normalizedSearch !== filters.search) {
      onFiltersChange(nextDiscoveryFilters(filters, { search: normalizedSearch }), { replace: true });
    }
  }, [debouncedSearch, filters, onFiltersChange]);

  useEffect(() => {
    if (meta && meta.totalItems > 0 && filters.page > Math.max(1, meta.totalPages)) {
      onFiltersChange({ ...filters, page: Math.max(1, meta.totalPages) }, { replace: true });
    }
  }, [filters, meta, onFiltersChange]);

  useEffect(() => {
    if (focusResultsAfterLoadRef.current && !placesQuery.isFetching && placesQuery.data?.meta.page === filters.page) {
      resultsHeadingRef.current?.focus();
      focusResultsAfterLoadRef.current = false;
    }
  }, [filters.page, placesQuery.data?.meta.page, placesQuery.isFetching]);

  const applyDesktopFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onFiltersChange(nextDiscoveryFilters(filters, { city: desktopCity.trim() || undefined }), { replace: true });
  };

  const applyMobileFilters = () => {
    onFiltersChange(nextDiscoveryFilters(filters, { city: mobileCity.trim() || undefined, type: mobileType }), {
      replace: true,
    });
    setSheetOpen(false);
  };

  const changeSheetOpen = (open: boolean) => {
    if (open) {
      setMobileCity(filters.city ?? '');
      setMobileType(filters.type);
    }
    setSheetOpen(open);
  };

  const clearFilters = () => {
    setSearchInput('');
    setDesktopCity('');
    setMobileCity('');
    setMobileType(undefined);
    onFiltersChange({ page: 1 }, { replace: true });
  };

  const errorPresentation = getCustomerErrorPresentation(placesQuery.error);

  return (
    <div className='px-page py-8 sm:py-10'>
      <div className='mx-auto w-full max-w-7xl space-y-6'>
        <header className='max-w-3xl'>
          <p className='text-sm font-semibold tracking-wide text-primary'>Local food, easier to explore</p>
          <h1 className='mt-2 text-3xl font-bold tracking-tight sm:text-4xl'>Find your next favorite place</h1>
          <p className='mt-3 text-muted-foreground'>Browse published restaurants, cafes, and food stalls near you.</p>
        </header>

        <div className='space-y-3'>
          <label htmlFor='place-discovery-search' className='text-sm font-medium'>
            Search places
          </label>
          <div className='flex gap-2'>
            <div className='relative min-w-0 flex-1'>
              <SearchIcon
                className='pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground'
                aria-hidden
              />
              <Input
                id='place-discovery-search'
                type='search'
                value={searchInput}
                maxLength={120}
                placeholder='Search by name or city'
                className='h-14 pr-4 pl-12 text-base'
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <Sheet open={sheetOpen} onOpenChange={changeSheetOpen}>
              <SheetTrigger asChild>
                <Button type='button' variant='outline' size='lg' className='md:hidden' aria-label='Open place filters'>
                  <FilterIcon aria-hidden />
                  <span className='hidden min-[380px]:inline'>Filters</span>
                  {activeFilterCount > 0 && <span aria-hidden>({activeFilterCount})</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side='bottom' className='max-h-[85vh] overflow-y-auto rounded-t-xl'>
                <SheetHeader>
                  <SheetTitle>Filter places</SheetTitle>
                  <SheetDescription>Choose a place type or enter an exact city name.</SheetDescription>
                </SheetHeader>
                <div className='grid gap-5 px-card'>
                  <DiscoveryFilters
                    idPrefix='mobile-place-filter'
                    city={mobileCity}
                    type={mobileType}
                    onCityChange={setMobileCity}
                    onTypeChange={setMobileType}
                  />
                </div>
                <SheetFooter className='grid grid-cols-2'>
                  <Button type='button' variant='outline' onClick={clearFilters}>
                    Clear all
                  </Button>
                  <Button type='button' onClick={applyMobileFilters}>
                    Apply filters
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <form
          onSubmit={applyDesktopFilters}
          className='hidden grid-cols-[minmax(12rem,15rem)_minmax(14rem,1fr)_auto] items-end gap-3 rounded-surface border bg-surface p-4 shadow-xs md:grid'
          aria-label='Filter places'
        >
          <DiscoveryFilters
            idPrefix='desktop-place-filter'
            city={desktopCity}
            type={filters.type}
            onCityChange={setDesktopCity}
            onTypeChange={(type) => onFiltersChange(nextDiscoveryFilters(filters, { type }), { replace: true })}
          />
          <Button type='submit'>Apply city</Button>
        </form>

        {hasFilters && (
          <div className='flex flex-wrap items-center gap-2' aria-label='Active filters'>
            {filters.search && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  setSearchInput('');
                  onFiltersChange(nextDiscoveryFilters(filters, { search: undefined }), { replace: true });
                }}
              >
                Search: {filters.search}
                <XIcon aria-hidden />
              </Button>
            )}
            {filters.type && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  setMobileType(undefined);
                  onFiltersChange(nextDiscoveryFilters(filters, { type: undefined }), { replace: true });
                }}
              >
                {placeTypeLabels[filters.type]}
                <XIcon aria-hidden />
              </Button>
            )}
            {filters.city && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  setDesktopCity('');
                  setMobileCity('');
                  onFiltersChange(nextDiscoveryFilters(filters, { city: undefined }), { replace: true });
                }}
              >
                City: {filters.city}
                <XIcon aria-hidden />
              </Button>
            )}
            <Button type='button' variant='ghost' size='sm' onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        <section aria-labelledby='place-results-heading' aria-busy={placesQuery.isFetching} className='space-y-4'>
          <div className='flex min-h-8 flex-wrap items-center justify-between gap-2'>
            <h2
              id='place-results-heading'
              ref={resultsHeadingRef}
              tabIndex={-1}
              className='text-xl font-semibold focus:outline-none'
            >
              Places
            </h2>
            {meta && <p className='text-sm text-muted-foreground'>{getResultRange(meta)}</p>}
          </div>

          {placesQuery.isFetching && !placesQuery.isPending && placesQuery.data && (
            <div
              className='h-1 overflow-hidden rounded-full bg-primary-subtle'
              role='progressbar'
              aria-label='Updating places'
            >
              <div className='h-full w-1/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none' />
            </div>
          )}

          {placesQuery.isError && placesQuery.data && (
            <div
              role='alert'
              className='flex flex-wrap items-center justify-between gap-3 rounded-surface border border-destructive/30 bg-destructive/5 p-4 text-sm'
            >
              <span>{errorPresentation.description}</span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void placesQuery.refetch()}
                disabled={placesQuery.isFetching}
              >
                Try again
              </Button>
            </div>
          )}

          {placesQuery.isPending || correctingPage ? (
            <DiscoverySkeleton />
          ) : placesQuery.isError && !placesQuery.data ? (
            <ErrorState
              title={errorPresentation.title}
              description={errorPresentation.description}
              tone={errorPresentation.tone}
              onRetry={errorPresentation.action === 'retry' ? () => void placesQuery.refetch() : undefined}
              isRetrying={placesQuery.isFetching}
            />
          ) : places.length === 0 ? (
            <EmptyState
              icon={hasFilters ? SearchIcon : Building2Icon}
              title={hasFilters ? 'No places match these filters' : 'No published places yet'}
              description={
                hasFilters
                  ? 'Try changing or clearing your search and filters.'
                  : 'Published places will appear here when they become available.'
              }
              action={
                hasFilters ? (
                  <Button type='button' variant='outline' onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <PlaceGrid places={places} filters={filters} />
              {meta && meta.totalPages > 1 && (
                <Pagination
                  page={meta.page}
                  pageSize={meta.limit}
                  totalItems={meta.totalItems}
                  totalPages={meta.totalPages}
                  disabled={placesQuery.isFetching}
                  onPageChange={(page) => {
                    focusResultsAfterLoadRef.current = true;
                    onFiltersChange(nextDiscoveryFilters(filters, { page }));
                  }}
                />
              )}
            </>
          )}
        </section>

        <p className='sr-only' aria-live='polite' aria-atomic='true'>
          {placesQuery.isFetching && !placesQuery.isPending ? 'Updating places.' : meta ? getResultRange(meta) : ''}
        </p>
      </div>
    </div>
  );
}

export {
  compactDiscoverySearch,
  DiscoverySkeleton,
  getPlaceCardMedia,
  getResultRange,
  nextDiscoveryFilters,
  PlaceCard,
  PlaceGrid,
  PublicPlaceDiscoveryPage,
  type PublicPlaceDiscoveryPageProps,
};
