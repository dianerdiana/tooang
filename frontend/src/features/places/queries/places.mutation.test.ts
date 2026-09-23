import { describe, expect, it, vi } from 'vitest';

import type { QueryClient } from '@tanstack/react-query';

import { placesKeys } from './places.key';
import { cachePlaceMutation } from './places.mutation';

describe('place mutation cache lifecycle', () => {
  it('stores the authoritative place and refreshes management collections after updates and toggles', async () => {
    const setQueryData = vi.fn();
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { setQueryData, invalidateQueries } as unknown as QueryClient;
    const place = { id: 'place-1', name: 'Updated Place', isPublished: true, isOrderingEnabled: false };

    await cachePlaceMutation(client, place as never);

    expect(setQueryData).toHaveBeenCalledWith(placesKeys.managementDetail('place-1'), place);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: placesKeys.management() });
  });
});
