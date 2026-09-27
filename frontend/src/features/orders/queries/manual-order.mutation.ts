import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';
import type { CreateManualOrderInput } from '../types/order.type';

import { placeOrderListKey } from './order-transition.mutation';

export const useCreateManualOrderMutation = (placeId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateManualOrderInput; idempotencyKey: string }) =>
      ordersService.createManual(placeId, input, idempotencyKey),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: placeOrderListKey(placeId) }),
        client.invalidateQueries({ queryKey: ['orders', 'dashboard-overview', placeId] }),
      ]);
    },
  });
};
