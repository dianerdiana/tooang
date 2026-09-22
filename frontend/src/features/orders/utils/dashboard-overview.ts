import type { ApiPaginationMeta } from '@/types/api-response.type';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

import type { OrderListScope } from '../types/order.type';

export const resolveOverviewOrderScope = (
  user: AuthenticatedUser,
  selectedPlace: PlaceMembership | null,
): OrderListScope | null => {
  if (selectedPlace) {
    return selectedPlace.effectivePermissions.includes(PERMISSION.ORDER_READ)
      ? { kind: 'place', placeId: selectedPlace.placeId }
      : null;
  }

  return user.globalPermissions.includes(PERMISSION.ORDER_READ) ? { kind: 'platform' } : null;
};

export const getOrderTotal = (meta: ApiPaginationMeta | undefined): number | undefined =>
  typeof meta?.totalItems === 'number' ? meta.totalItems : undefined;

export const combineOrderTotals = (...totals: Array<number | undefined>): number | undefined =>
  totals.every((total): total is number => typeof total === 'number')
    ? totals.reduce((sum, total) => sum + total, 0)
    : undefined;
