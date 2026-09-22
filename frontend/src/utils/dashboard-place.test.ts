import { describe, expect, it } from 'vitest';

import { PlaceMemberRole } from '@/types/enums/user-role.enum';
import type { PlaceMembership } from '@/types/user-data.type';

import { parseDashboardSearch, resolveDashboardPlace, sortPlaceMemberships } from './dashboard-place';

const membership = (placeId: string, name: string): PlaceMembership => ({
  placeId,
  place: { name, isPublished: true, isOrderingEnabled: true },
  role: PlaceMemberRole.OWNER,
  permissions: [],
  effectivePermissions: [],
});

const alpha = membership('place_alpha', 'Alpha Cafe');
const zulu = membership('place_zulu', 'Zulu Cafe');

describe('dashboard place selection', () => {
  it('parses only a non-empty string placeId', () => {
    expect(parseDashboardSearch({ placeId: ' place_alpha ' })).toEqual({ placeId: 'place_alpha' });
    expect(parseDashboardSearch({ placeId: 123 })).toEqual({});
    expect(parseDashboardSearch({ placeId: '   ' })).toEqual({});
  });

  it('keeps a requested accessible place', () => {
    expect(resolveDashboardPlace([alpha, zulu], 'place_zulu')).toBe(zulu);
  });

  it('falls back alphabetically for missing or stale selection', () => {
    expect(resolveDashboardPlace([zulu, alpha])).toBe(alpha);
    expect(resolveDashboardPlace([zulu, alpha], 'stale_place')).toBe(alpha);
    expect(sortPlaceMemberships([zulu, alpha])).toEqual([alpha, zulu]);
  });

  it('returns no selection when no active membership remains', () => {
    expect(resolveDashboardPlace([], 'stale_place')).toBeNull();
  });
});
