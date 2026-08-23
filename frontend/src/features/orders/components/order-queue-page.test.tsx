import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { ORDER_STATUS, type OrderStatus, type OrderSummary } from '../types/order.type';

import { fulfillmentLabel, OrderQueueResults } from './order-queue-page';
import { OrderStatusBadge, orderStatusPresentation } from './order-status-badge';

const order = (status: OrderStatus, suffix: string): OrderSummary => ({
  orderId: `order-${suffix}`,
  orderCode: `TNG-20260923-${suffix.padEnd(8, 'A')}`,
  place: { placeId: 'place-1', name: 'Warung Tooang' },
  status,
  fulfillmentType: 'DINE_IN',
  customerName: `Customer ${suffix}`,
  diningTableName: 'Table 4',
  subtotal: 45000,
  createdAt: '2026-09-23T05:00:00.000Z',
  statusUpdatedAt: '2026-09-23T05:10:00.000Z',
  expiresAt: '2026-09-23T05:15:00.000Z',
});

describe('operational order queue presentation', () => {
  it('provides semantic labels for every documented status', () => {
    for (const status of Object.values(ORDER_STATUS)) {
      const markup = renderToStaticMarkup(<OrderStatusBadge status={status} />);
      expect(markup).toContain(`Order status: ${orderStatusPresentation[status].label}`);
      expect(markup).toContain(orderStatusPresentation[status].label);
    }
  });

  it('renders supported summary fields without mutation controls', () => {
    const markup = renderToStaticMarkup(
      <OrderQueueResults
        orders={[order('PENDING', 'PENDING'), order('READY', 'READY')]}
        onViewOrder={() => undefined}
      />,
    );

    expect(markup).toContain('Customer PENDING');
    expect(markup).toContain('Dine in · Table 4');
    expect(markup).toContain('45.000');
    expect(markup).toContain('border-warning/60');
    expect(markup).toContain('border-success/60');
    expect(markup).toContain('View order');
    expect(markup).not.toContain('Confirm order');
    expect(markup).not.toContain('Complete order');
  });

  it('distinguishes takeaway from dine-in table snapshots', () => {
    const takeaway = { ...order('CONFIRMED', 'TAKEAWAY'), fulfillmentType: 'TAKEAWAY' as const };

    expect(fulfillmentLabel(takeaway)).toBe('Takeaway');
    expect(fulfillmentLabel(order('CONFIRMED', 'DINEIN'))).toBe('Dine in · Table 4');
  });

  it('includes place identity only for global results', () => {
    const placeResult = renderToStaticMarkup(
      <OrderQueueResults orders={[order('READY', 'GLOBAL')]} onViewOrder={() => undefined} />,
    );
    const globalResult = renderToStaticMarkup(
      <OrderQueueResults orders={[order('READY', 'GLOBAL')]} onViewOrder={() => undefined} showPlace />,
    );

    expect(placeResult).not.toContain('Warung Tooang');
    expect(globalResult).toContain('Warung Tooang');
  });
});
