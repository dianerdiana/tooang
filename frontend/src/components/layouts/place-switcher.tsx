import { Building2Icon } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';

import { sortPlaceMemberships } from '@/utils/dashboard-place';

import type { PlaceMembership } from '@/types/user-data.type';

type PlaceSwitcherProps = {
  memberships: readonly PlaceMembership[];
  selectedPlace: PlaceMembership | null;
  isPlatformContext: boolean;
  onPlaceChange: (placeId: string) => void;
};

function PlaceContext({ membership }: { membership: PlaceMembership }) {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <Building2Icon aria-hidden='true' className='size-4 shrink-0 text-primary' />
      <span className='truncate text-sm font-semibold'>{membership.place.name}</span>
      <span className='hidden shrink-0 text-xs text-muted-foreground sm:inline'>{membership.role}</span>
      <StatusBadge tone={membership.place.isPublished ? 'success' : 'neutral'} className='hidden lg:inline-flex'>
        {membership.place.isPublished ? 'Published' : 'Draft'}
      </StatusBadge>
      <StatusBadge tone={membership.place.isOrderingEnabled ? 'primary' : 'neutral'} className='hidden xl:inline-flex'>
        {membership.place.isOrderingEnabled ? 'Ordering on' : 'Ordering off'}
      </StatusBadge>
    </div>
  );
}

function PlaceSwitcher({ memberships, selectedPlace, isPlatformContext, onPlaceChange }: PlaceSwitcherProps) {
  if (isPlatformContext) {
    return (
      <StatusBadge tone='primary' className='min-h-7 px-3'>
        Platform
      </StatusBadge>
    );
  }

  if (!selectedPlace) {
    return (
      <StatusBadge tone='neutral' className='min-h-7 px-3'>
        Dashboard
      </StatusBadge>
    );
  }

  const sortedMemberships = sortPlaceMemberships(memberships);
  if (sortedMemberships.length === 1) return <PlaceContext membership={selectedPlace} />;

  return (
    <Select value={selectedPlace.placeId} onValueChange={onPlaceChange}>
      <SelectTrigger className='h-11 w-full max-w-72 bg-surface sm:w-72' aria-label='Select active place'>
        <SelectValue>
          <PlaceContext membership={selectedPlace} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent align='start'>
        {sortedMemberships.map((membership) => (
          <SelectItem key={membership.placeId} value={membership.placeId} className='min-h-11'>
            <span className='flex min-w-0 flex-col pr-2'>
              <span className='truncate font-medium'>{membership.place.name}</span>
              <span className='text-xs text-muted-foreground'>
                {membership.role} · {membership.place.isPublished ? 'Published' : 'Draft'} ·{' '}
                {membership.place.isOrderingEnabled ? 'Ordering on' : 'Ordering off'}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { PlaceSwitcher, type PlaceSwitcherProps };
