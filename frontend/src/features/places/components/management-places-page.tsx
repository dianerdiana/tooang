import { type FormEvent, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Building2Icon, SearchIcon, XIcon } from 'lucide-react';

import { PageHeader } from '@/components/layouts/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { isApplicationError } from '@/utils/api-error.util';

import { managementPlacesQueryOptions } from '../queries/places.query';
import { type NormalizedPlaceListParams, PLACE_TYPE, type PlaceSummary, type PlaceType } from '../types/places.type';

type ManagementPlacesPageProps = {
  filters: NormalizedPlaceListParams;
  onFiltersChange: (filters: NormalizedPlaceListParams) => void;
};

const placeTypeLabels: Record<PlaceType, string> = {
  RESTAURANT: 'Restaurant',
  CAFE: 'Cafe',
  FOOD_STALL: 'Food stall',
  OTHER: 'Other',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

function PlaceStatuses({ place }: { place: PlaceSummary }) {
  return (
    <div className='flex flex-wrap gap-2'>
      <StatusBadge tone={place.isPublished ? 'success' : 'neutral'} showDot>
        {place.isPublished ? 'Published' : 'Draft'}
      </StatusBadge>
      <StatusBadge tone={place.isOrderingEnabled ? 'primary' : 'neutral'} showDot>
        {place.isOrderingEnabled ? 'Ordering enabled' : 'Ordering disabled'}
      </StatusBadge>
    </div>
  );
}

function PlaceCards({ places, filters }: { places: PlaceSummary[]; filters: NormalizedPlaceListParams }) {
  return (
    <div className='space-y-3 md:hidden' aria-label='Places'>
      {places.map((place) => (
        <article key={place.id} className='space-y-4 rounded-surface border bg-surface p-4 shadow-xs'>
          <div className='min-w-0'>
            <h2 className='truncate font-semibold'>
              <Link
                to='/dashboard/platform/places/$placeId'
                params={{ placeId: place.id }}
                search={filters}
                className='underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                {place.name}
              </Link>
            </h2>
            <p className='mt-1 truncate text-sm text-muted-foreground'>/{place.slug}</p>
          </div>
          <PlaceStatuses place={place} />
          <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm'>
            <dt className='text-muted-foreground'>Type</dt>
            <dd className='text-right'>{placeTypeLabels[place.type]}</dd>
            <dt className='text-muted-foreground'>Location</dt>
            <dd className='min-w-0 text-right'>
              <span className='block truncate'>{place.city ?? 'City not provided'}</span>
              <span className='block truncate text-xs text-muted-foreground'>{place.address}</span>
            </dd>
            <dt className='text-muted-foreground'>Created</dt>
            <dd className='text-right'>
              <time dateTime={place.createdAt}>{formatDate(place.createdAt)}</time>
            </dd>
          </dl>
        </article>
      ))}
    </div>
  );
}

function PlacesTable({ places, filters }: { places: PlaceSummary[]; filters: NormalizedPlaceListParams }) {
  return (
    <div className='hidden overflow-hidden rounded-surface border bg-table shadow-xs md:block'>
      <Table aria-label='Places'>
        <TableHeader>
          <TableRow>
            <TableHead>Place</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className='text-right'>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {places.map((place) => (
            <TableRow key={place.id}>
              <TableCell>
                <Link
                  to='/dashboard/platform/places/$placeId'
                  params={{ placeId: place.id }}
                  search={filters}
                  className='block max-w-56 truncate font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  {place.name}
                </Link>
                <span className='block max-w-56 truncate text-xs text-muted-foreground'>/{place.slug}</span>
              </TableCell>
              <TableCell>{placeTypeLabels[place.type]}</TableCell>
              <TableCell>
                <span className='block max-w-64 truncate'>{place.city ?? 'City not provided'}</span>
                <span className='block max-w-64 truncate text-xs text-muted-foreground'>{place.address}</span>
              </TableCell>
              <TableCell>
                <PlaceStatuses place={place} />
              </TableCell>
              <TableCell className='text-right'>
                <time dateTime={place.createdAt}>{formatDate(place.createdAt)}</time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlacesLoading() {
  return (
    <div role='status' aria-label='Loading places' className='space-y-3'>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className='h-24 w-full md:h-14' />
      ))}
    </div>
  );
}

function ManagementPlacesPage({ filters, onFiltersChange }: ManagementPlacesPageProps) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [city, setCity] = useState(filters.city ?? '');
  const placesQuery = useQuery(managementPlacesQueryOptions(filters));
  const hasFilters = Boolean(filters.search || filters.type || filters.city);

  const updateFilters = (next: Partial<NormalizedPlaceListParams>) =>
    onFiltersChange({ ...filters, ...next, page: next.page ?? 1 });

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters({ search: search.trim() || undefined, city: city.trim() || undefined });
  };

  const clearFilters = () => {
    setSearch('');
    setCity('');
    onFiltersChange({ page: 1, limit: filters.limit });
  };

  const errorDescription = isApplicationError(placesQuery.error)
    ? placesQuery.error.message
    : 'We could not load the platform places. Please try again.';
  const places = placesQuery.data?.places ?? [];
  const meta = placesQuery.data?.meta;
  const totalItems = meta?.totalItems ?? 0;
  const totalPages = meta?.totalPages ?? 0;

  return (
    <>
      <PageHeader
        title='Places'
        description='View active places across the Tooang platform, including published places and drafts.'
      />

      <form
        onSubmit={submitFilters}
        className='grid gap-3 rounded-surface border bg-surface p-4 shadow-xs lg:grid-cols-[minmax(14rem,1fr)_13rem_13rem_auto]'
        aria-label='Filter places'
      >
        <div className='space-y-1.5'>
          <label htmlFor='places-search' className='text-sm font-medium'>
            Search
          </label>
          <Input
            id='places-search'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={120}
            placeholder='Name or city'
          />
        </div>
        <div className='space-y-1.5'>
          <label htmlFor='places-type' className='text-sm font-medium'>
            Type
          </label>
          <Select
            value={filters.type ?? 'ALL'}
            onValueChange={(value) => updateFilters({ type: value === 'ALL' ? undefined : (value as PlaceType) })}
          >
            <SelectTrigger id='places-type' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All types</SelectItem>
              {Object.values(PLACE_TYPE).map((type) => (
                <SelectItem key={type} value={type}>
                  {placeTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <label htmlFor='places-city' className='text-sm font-medium'>
            City
          </label>
          <Input
            id='places-city'
            value={city}
            onChange={(event) => setCity(event.target.value)}
            maxLength={100}
            placeholder='Exact city'
          />
        </div>
        <div className='flex items-end gap-2'>
          <Button type='submit' className='flex-1 lg:flex-none'>
            <SearchIcon aria-hidden />
            Search
          </Button>
          {hasFilters && (
            <Button type='button' variant='outline' onClick={clearFilters} aria-label='Clear place filters'>
              <XIcon aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </form>

      {placesQuery.isPending ? (
        <PlacesLoading />
      ) : placesQuery.isError && !placesQuery.data ? (
        <ErrorState
          title='Could not load places'
          description={errorDescription}
          onRetry={() => void placesQuery.refetch()}
          isRetrying={placesQuery.isFetching}
        />
      ) : places.length === 0 ? (
        <EmptyState
          icon={Building2Icon}
          title={hasFilters ? 'No places match these filters' : 'No places yet'}
          description={
            hasFilters
              ? 'Try changing or clearing the search and filters.'
              : 'Active platform places will appear here after they are created.'
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
        <div className='space-y-4'>
          <PlaceCards places={places} filters={filters} />
          <PlacesTable places={places} filters={filters} />
          <Pagination
            page={filters.page}
            pageSize={filters.limit}
            totalItems={totalItems}
            totalPages={totalPages}
            disabled={placesQuery.isFetching}
            onPageChange={(page) => updateFilters({ page })}
            onPageSizeChange={(limit) => onFiltersChange({ ...filters, page: 1, limit })}
          />
        </div>
      )}

      <p className='sr-only' aria-live='polite'>
        {placesQuery.isFetching && !placesQuery.isPending ? 'Updating places.' : ''}
      </p>
    </>
  );
}

export { ManagementPlacesPage, type ManagementPlacesPageProps, PlaceStatuses };
