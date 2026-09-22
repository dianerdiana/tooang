import type { PlaceMembership } from '@/types/user-data.type';

export type DashboardSearch = {
  placeId?: string;
};

export const parseDashboardSearch = (search: Record<string, unknown>): DashboardSearch => {
  const placeId = typeof search.placeId === 'string' ? search.placeId.trim() : '';
  return placeId ? { placeId } : {};
};

export const sortPlaceMemberships = (memberships: readonly PlaceMembership[]) =>
  [...memberships].sort(
    (left, right) =>
      left.place.name.localeCompare(right.place.name, undefined, { sensitivity: 'base' }) ||
      left.placeId.localeCompare(right.placeId),
  );

export const resolveDashboardPlace = (
  memberships: readonly PlaceMembership[],
  requestedPlaceId?: string,
): PlaceMembership | null => {
  const sortedMemberships = sortPlaceMemberships(memberships);
  return (
    sortedMemberships.find((membership) => membership.placeId === requestedPlaceId) ?? sortedMemberships[0] ?? null
  );
};
