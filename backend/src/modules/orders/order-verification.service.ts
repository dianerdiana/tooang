import { Injectable, NotFoundException, Optional } from '@nestjs/common';

import { WinstonLoggerService } from '../../lib';

import { OrdersRepository } from './orders.repository';

const VERIFICATION_TOKEN = /^[A-Za-z0-9_-]{43}$/u;

@Injectable()
export class OrderVerificationService {
  constructor(
    private readonly repository: OrdersRepository,
    @Optional() private readonly logger?: WinstonLoggerService,
  ) {}

  async verify(token: string) {
    if (!VERIFICATION_TOKEN.test(token)) this.notFound('invalid_format');
    const [{ now }] = await this.repository.databaseNow();
    const order = await this.repository.findPublicVerification(token, now);
    if (!order) this.notFound('not_found_or_expired');
    return {
      orderCode: order.orderCode,
      placeName: order.place.name,
      status: order.status,
      fulfillmentType: order.fulfillmentType,
      createdAt: order.createdAt.toISOString(),
      expiresAt: order.expiresAt.toISOString(),
      statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    };
  }

  private notFound(category: string): never {
    this.logger?.warn('Order verification failed', {
      event: 'order.verification.failed',
      category,
    });
    throw new NotFoundException({
      message: 'Order verification not found',
      code: 'ORDER_VERIFICATION_NOT_FOUND',
    });
  }
}
