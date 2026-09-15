import { Injectable } from '@nestjs/common';

import { OrdersRepository } from './orders.repository';

export const ORDER_EXPIRY_BATCH_SIZE = 100;
export const ORDER_EXPIRY_MAX_BATCHES = 10;

@Injectable()
export class OrderExpiryService {
  constructor(private readonly repository: OrdersRepository) {}

  async runCycle() {
    let batches = 0;
    let expired = 0;
    while (batches < ORDER_EXPIRY_MAX_BATCHES) {
      const ids = await this.repository.expirePendingBatch(ORDER_EXPIRY_BATCH_SIZE);
      batches += 1;
      expired += ids.length;
      if (ids.length < ORDER_EXPIRY_BATCH_SIZE) return { batches, expired, capped: false };
    }
    return { batches, expired, capped: true };
  }
}
