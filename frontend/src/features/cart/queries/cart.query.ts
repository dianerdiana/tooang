import { queryOptions } from '@tanstack/react-query';

import { cartUuidSchema } from '../schemas/cart.schema';
import { cartService } from '../services/cart.service';

export const cartKeys = {
  place: (placeId: string) => ['cart', 'place', cartUuidSchema.parse(placeId)] as const,
};

export const cartQueryOptions = (placeId: string, enabled = true) => {
  const normalizedPlaceId = cartUuidSchema.parse(placeId);
  return queryOptions({
    queryKey: cartKeys.place(normalizedPlaceId),
    queryFn: () => cartService.get(normalizedPlaceId),
    enabled,
    staleTime: 15_000,
  });
};
