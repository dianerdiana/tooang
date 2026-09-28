import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ChevronDownIcon,
  Clock3Icon,
  Globe2Icon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  StarIcon,
  UtensilsIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { PlaceOpenStateBadge, PlaceOrderingStateBadge } from '@/components/ui/customer-status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { Skeleton } from '@/components/ui/skeleton';

import { publicPlaceQueryOptions } from '@/features/places/queries/places.query';
import {
  DAY_OF_WEEK,
  type DayOfWeek,
  type PublicPlaceBusinessHour,
  type PublicPlaceDetail,
  type PublicPlaceDiscoverySearch,
} from '@/features/places/types/places.type';
import { PublicPlaceReviewsSection } from '@/features/reviews/components/public-place-reviews-section';

import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';

type PublicPlaceDetailPageProps = {
  slug: string;
  discoverySearch: PublicPlaceDiscoverySearch;
};

const DAY_ORDER = Object.values(DAY_OF_WEEK);

const dayLabels: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const placeTypeLabels = {
  RESTAURANT: 'Restaurant',
  CAFE: 'Cafe',
  FOOD_STALL: 'Food stall',
  OTHER: 'Other',
} as const;

function getDayInTimezone(timezone: string, instant = new Date()): DayOfWeek | undefined {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' })
      .format(instant)
      .toUpperCase();
    return DAY_ORDER.find((day) => day === weekday);
  } catch {
    return undefined;
  }
}

function formatBusinessHour(hour: PublicPlaceBusinessHour | undefined) {
  if (!hour || hour.isClosed || !hour.opensAt || !hour.closesAt) return 'Closed';
  const overnight = hour.closesAt < hour.opensAt;
  return `${hour.opensAt}–${hour.closesAt}${overnight ? ' (overnight)' : ''}`;
}

function orderBusinessHours(hours: readonly PublicPlaceBusinessHour[]) {
  const byDay = new Map(hours.map((hour) => [hour.day, hour]));
  return DAY_ORDER.map((day) => byDay.get(day)).filter((hour): hour is PublicPlaceBusinessHour => Boolean(hour));
}

function getPlaceHeroMedia(place: Pick<PublicPlaceDetail, 'coverUrl' | 'logoUrl'>) {
  if (place.coverUrl) return { src: place.coverUrl, fit: 'cover' as const, kind: 'cover' as const };
  if (place.logoUrl) return { src: place.logoUrl, fit: 'contain' as const, kind: 'logo' as const };
  return { src: undefined, fit: 'cover' as const, kind: 'fallback' as const };
}

function sanitizeTelephoneHref(value: string) {
  const target = value.replace(/[^\d+*#,;]/g, '');
  return /\d/.test(target) ? `tel:${target}` : undefined;
}

function sanitizeWhatsAppHref(value: string) {
  const target = value.replace(/\D/g, '');
  return target ? `https://wa.me/${target}` : undefined;
}

function PlaceHero({ place }: { place: PublicPlaceDetail }) {
  const media = getPlaceHeroMedia(place);
  return (
    <div className='relative'>
      <ResponsiveImage
        src={media.src}
        fit={media.fit}
        aspect='wide'
        alt={media.kind === 'cover' ? `${place.name} cover` : media.kind === 'logo' ? `${place.name} logo` : ''}
        fallbackLabel={`${place.name} image unavailable`}
        className='max-h-128 rounded-none sm:rounded-surface'
      />
      {place.coverUrl && place.logoUrl && (
        <div className='absolute bottom-4 left-4 size-20 overflow-hidden rounded-xl border-2 border-surface bg-surface shadow-sm sm:size-24'>
          <ResponsiveImage
            src={place.logoUrl}
            fit='contain'
            aspect='square'
            alt={`${place.name} logo`}
            className='size-full rounded-none border-0'
          />
        </div>
      )}
    </div>
  );
}

function AvailabilitySummary({ place }: { place: Pick<PublicPlaceDetail, 'isOpen' | 'isOrderingEnabled'> }) {
  const limitations = [
    ...(!place.isOpen ? ['This place is currently closed.'] : []),
    ...(!place.isOrderingEnabled ? ['Online ordering is unavailable.'] : []),
  ];

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        <PlaceOpenStateBadge state={place.isOpen ? 'OPEN' : 'CLOSED'} />
        <PlaceOrderingStateBadge enabled={place.isOrderingEnabled} />
      </div>
      {limitations.length > 0 && (
        <CustomerAlert
          tone='warning'
          title='Browsing is still available'
          description={`${limitations.join(' ')} You can continue browsing the menu.`}
        />
      )}
    </div>
  );
}

function PlaceContactDetails({ place }: { place: PublicPlaceDetail }) {
  const telephoneHref = place.phone ? sanitizeTelephoneHref(place.phone) : undefined;
  const whatsappHref = place.whatsapp ? sanitizeWhatsAppHref(place.whatsapp) : undefined;
  const hasContact = Boolean(place.phone || place.whatsapp);

  return (
    <Card aria-labelledby='place-details-heading'>
      <CardHeader>
        <CardTitle id='place-details-heading'>Place details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className='grid gap-4 text-sm'>
          <div className='grid grid-cols-[auto_minmax(0,1fr)] gap-3'>
            <MapPinIcon className='mt-0.5 size-5 text-muted-foreground' aria-hidden />
            <div className='min-w-0'>
              <dt className='font-medium'>Address</dt>
              <dd className='mt-1 wrap-break-word text-muted-foreground'>{place.address}</dd>
            </div>
          </div>
          <div className='grid grid-cols-[auto_minmax(0,1fr)] gap-3'>
            <Globe2Icon className='mt-0.5 size-5 text-muted-foreground' aria-hidden />
            <div className='min-w-0'>
              <dt className='font-medium'>Timezone</dt>
              <dd className='mt-1 wrap-break-word text-muted-foreground'>{place.timezone}</dd>
            </div>
          </div>
          {place.phone && (
            <div className='grid grid-cols-[auto_minmax(0,1fr)] gap-3'>
              <PhoneIcon className='mt-0.5 size-5 text-muted-foreground' aria-hidden />
              <div className='min-w-0'>
                <dt className='font-medium'>Phone</dt>
                <dd className='mt-1 break-all text-muted-foreground'>
                  {telephoneHref ? (
                    <a className='underline underline-offset-4' href={telephoneHref}>
                      {place.phone}
                    </a>
                  ) : (
                    place.phone
                  )}
                </dd>
              </div>
            </div>
          )}
          {place.whatsapp && (
            <div className='grid grid-cols-[auto_minmax(0,1fr)] gap-3'>
              <MessageCircleIcon className='mt-0.5 size-5 text-muted-foreground' aria-hidden />
              <div className='min-w-0'>
                <dt className='font-medium'>WhatsApp</dt>
                <dd className='mt-1 break-all text-muted-foreground'>
                  {whatsappHref ? (
                    <a className='underline underline-offset-4' href={whatsappHref} target='_blank' rel='noreferrer'>
                      {place.whatsapp}
                    </a>
                  ) : (
                    place.whatsapp
                  )}
                </dd>
              </div>
            </div>
          )}
        </dl>
        {!hasContact && <p className='mt-5 text-sm text-muted-foreground'>Contact information is not available.</p>}
      </CardContent>
    </Card>
  );
}

function BusinessHoursSection({ place, instant = new Date() }: { place: PublicPlaceDetail; instant?: Date }) {
  const today = getDayInTimezone(place.timezone, instant);
  const hours = orderBusinessHours(place.businessHours);
  const todayHours = hours.find((hour) => hour.day === today);

  return (
    <Card aria-labelledby='business-hours-heading'>
      <CardHeader>
        <CardTitle id='business-hours-heading' className='flex items-center gap-2'>
          <Clock3Icon className='size-5 text-muted-foreground' aria-hidden />
          Business hours
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-surface-subtle p-4'>
          <span className='font-medium'>{today ? `Today · ${dayLabels[today]}` : 'Today'}</span>
          <span className='font-semibold tabular-nums'>{formatBusinessHour(todayHours)}</span>
        </div>
        <details className='group rounded-lg border'>
          <summary className='flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden'>
            All weekly hours
            <ChevronDownIcon
              className='size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none'
              aria-hidden
            />
          </summary>
          <dl className='border-t px-4 py-2'>
            {hours.map((hour) => (
              <div key={hour.day} className='flex flex-wrap justify-between gap-2 border-b py-2.5 last:border-0'>
                <dt className='font-medium'>
                  {dayLabels[hour.day]}
                  {hour.day === today && <span className='ml-2 text-xs text-primary'>(Today)</span>}
                </dt>
                <dd className='tabular-nums text-muted-foreground'>{formatBusinessHour(hour)}</dd>
              </div>
            ))}
          </dl>
        </details>
        <p className='text-xs text-muted-foreground'>Times are shown in {place.timezone}.</p>
      </CardContent>
    </Card>
  );
}

function PlaceDetailContent({
  place,
  discoverySearch,
}: {
  place: PublicPlaceDetail;
  discoverySearch: PublicPlaceDiscoverySearch;
}) {
  return (
    <article className='pb-8'>
      <PlaceHero place={place} />
      <div className='mx-auto w-full max-w-6xl space-y-6 px-page pt-6'>
        <div className='grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
          <div className='min-w-0 space-y-5'>
            <header className='min-w-0'>
              <p className='text-sm font-semibold text-primary'>
                {placeTypeLabels[place.type]}
                {place.city ? ` · ${place.city}` : ''}
              </p>
              <h1 className='mt-2 wrap-break-word text-3xl font-bold tracking-tight sm:text-4xl'>{place.name}</h1>
            </header>
            <AvailabilitySummary place={place} />
            <div className='grid gap-3 sm:grid-cols-2'>
              <Button asChild size='lg'>
                <Link to='/places/$slug/menu' params={{ slug: place.slug }} search={discoverySearch}>
                  <UtensilsIcon aria-hidden /> Browse menu
                </Link>
              </Button>
              <Button asChild size='lg' variant='outline'>
                <a href='#reviews'>
                  <StarIcon aria-hidden /> Reviews
                </a>
              </Button>
            </div>
            <section aria-labelledby='about-place-heading' className='max-w-3xl'>
              <h2 id='about-place-heading' className='text-xl font-semibold'>
                About
              </h2>
              <p className='mt-3 wrap-break-word whitespace-pre-line text-muted-foreground'>
                {place.description || 'No description is available for this place.'}
              </p>
            </section>
          </div>
          <div className='space-y-6'>
            <PlaceContactDetails place={place} />
            <BusinessHoursSection place={place} />
          </div>
        </div>

        <PublicPlaceReviewsSection placeId={place.id} placeSlug={place.slug} />
      </div>
    </article>
  );
}

function PlaceDetailSkeleton() {
  return (
    <div role='status' aria-label='Loading place details' className='pb-8'>
      <Skeleton className='aspect-video w-full rounded-none sm:rounded-surface' />
      <div className='mx-auto grid w-full max-w-6xl gap-6 px-page pt-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <div className='space-y-5'>
          <Skeleton className='h-5 w-32' />
          <Skeleton className='h-10 w-3/4' />
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-28 w-full' />
        </div>
        <div className='space-y-6'>
          <Skeleton className='h-64 w-full rounded-surface' />
          <Skeleton className='h-64 w-full rounded-surface' />
        </div>
      </div>
    </div>
  );
}

function PublicPlaceDetailPage({ slug, discoverySearch }: PublicPlaceDetailPageProps) {
  const placeQuery = useQuery(publicPlaceQueryOptions(slug));
  const errorPresentation = useMemo(() => getCustomerErrorPresentation(placeQuery.error), [placeQuery.error]);

  if (placeQuery.isPending) return <PlaceDetailSkeleton />;

  if (placeQuery.isError && !placeQuery.data) {
    const isNotFound = errorPresentation.kind === 'not-found';
    return (
      <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
        <ErrorState
          className='w-full'
          title={isNotFound ? 'Place unavailable' : errorPresentation.title}
          description={
            isNotFound ? 'This place could not be found or is not available publicly.' : errorPresentation.description
          }
          tone={isNotFound ? 'not-found' : errorPresentation.tone}
          onRetry={!isNotFound && errorPresentation.action === 'retry' ? () => void placeQuery.refetch() : undefined}
          isRetrying={placeQuery.isFetching}
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

  return (
    <>
      {placeQuery.isFetching && (
        <div className='h-1 overflow-hidden bg-primary-subtle' role='progressbar' aria-label='Updating place details'>
          <div className='h-full w-1/3 animate-pulse rounded-full bg-primary motion-reduce:animate-none' />
        </div>
      )}
      {placeQuery.isError && placeQuery.data && (
        <div className='mx-auto w-full max-w-6xl px-page pt-4'>
          <CustomerAlert
            tone='error'
            title='Place details could not be refreshed'
            description='The last available place details are still shown.'
            action={
              <Button type='button' variant='outline' size='sm' onClick={() => void placeQuery.refetch()}>
                Try again
              </Button>
            }
          />
        </div>
      )}
      {placeQuery.data && <PlaceDetailContent place={placeQuery.data} discoverySearch={discoverySearch} />}
    </>
  );
}

export {
  AvailabilitySummary,
  BusinessHoursSection,
  formatBusinessHour,
  getDayInTimezone,
  getPlaceHeroMedia,
  orderBusinessHours,
  PlaceContactDetails,
  PlaceDetailContent,
  PlaceDetailSkeleton,
  PlaceHero,
  PublicPlaceDetailPage,
  type PublicPlaceDetailPageProps,
  sanitizeTelephoneHref,
  sanitizeWhatsAppHref,
};
