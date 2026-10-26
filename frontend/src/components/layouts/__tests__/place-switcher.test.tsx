// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PlaceMemberRole } from '@/types/enums/user-role.enum';
import type { PlaceMembership } from '@/types/user-data.type';

import { PlaceSwitcher } from '../place-switcher';

const membership = (placeId: string, name: string, role: PlaceMemberRole): PlaceMembership => ({
  placeId,
  place: { name, isPublished: true, isOrderingEnabled: false },
  role,
  permissions: [],
  effectivePermissions: [],
});

const alpha = membership('place_alpha', 'Alpha Cafe', PlaceMemberRole.OWNER);
const zulu = membership('place_zulu', 'Zulu Cafe', PlaceMemberRole.CASHIER);

describe('PlaceSwitcher', () => {
  it('labels the role of a single membership', () => {
    render(
      <PlaceSwitcher
        memberships={[alpha]}
        selectedPlace={alpha}
        isPlatformContext={false}
        onPlaceChange={() => undefined}
      />,
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.queryByText('OWNER')).not.toBeInTheDocument();
  });

  it('labels roles in the place selection options', async () => {
    const user = userEvent.setup();
    render(
      <PlaceSwitcher
        memberships={[zulu, alpha]}
        selectedPlace={alpha}
        isPlatformContext={false}
        onPlaceChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Select active place' }));

    expect(await screen.findByText('Cashier · Published · Ordering off')).toBeInTheDocument();
    expect(screen.queryByText(/CASHIER ·/)).not.toBeInTheDocument();
  });
});
