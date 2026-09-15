import { Injectable, NotFoundException } from '@nestjs/common';

import { OrdersRepository } from './orders.repository';

const VERIFICATION_TOKEN = /^[A-Za-z0-9_-]{43}$/u;

@Injectable()
export class OrderVerificationService {
  constructor(private readonly repository: OrdersRepository) {}

  async verify(token: string) {
    if (!VERIFICATION_TOKEN.test(token)) this.notFound();
    const [{ now }] = await this.repository.databaseNow();
    const order = await this.repository.findPublicVerification(token, now);
    if (!order) this.notFound();
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

  private notFound(): never {
    throw new NotFoundException({
      message: 'Order verification not found',
      code: 'ORDER_VERIFICATION_NOT_FOUND',
    });
  }
}
