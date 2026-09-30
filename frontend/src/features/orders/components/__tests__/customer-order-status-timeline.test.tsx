import { describe, expect, it } from 'vitest';

import type { OrderDetail, OrderStatus } from '../../types/order.type';
import { buildCustomerOrderTimeline } from '../customer-order-status-timeline';

const detail = (status: OrderStatus): OrderDetail => ({
  orderId: 'order-1',
  orderCode: 'TNG-20260929-ABCDEFGH',
  source: 'CUSTOMER',
  createdBy: null,
  place: { placeId: 'place-1', name: 'Warung Kita' },
  status,
  fulfillmentType: 'TAKEAWAY',
  customerName: 'Ayu',
  diningTableName: null,
  subtotal: 50_000,
  createdAt: '2026-09-29T05:00:00.000Z',
  statusUpdatedAt: '2026-09-29T05:10:00.000Z',
  expiresAt: '2026-09-29T05:15:00.000Z',
  customerNote: null,
  cancellationReason: status === 'CANCELLED' ? 'Changed plans' : null,
  diningTable: null,
  confirmedAt: ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].includes(status) ? '2026-09-29T05:05:00.000Z' : null,
  completedAt: status === 'COMPLETED' ? '2026-09-29T05:30:00.000Z' : null,
  cancelledAt: status === 'CANCELLED' ? '2026-09-29T05:08:00.000Z' : null,
  items: [],
});

describe('customer order status timeline', () => {
  it.each([
    ['PENDING', ['placed', 'pending'], 'pending'],
    ['CONFIRMED', ['placed', 'confirmed', 'preparing', 'ready', 'completed'], 'confirmed'],
    ['PREPARING', ['placed', 'confirmed', 'preparing', 'ready', 'completed'], 'preparing'],
    ['READY', ['placed', 'confirmed', 'preparing', 'ready', 'completed'], 'ready'],
    ['COMPLETED', ['placed', 'confirmed', 'preparing', 'ready', 'completed'], 'completed'],
    ['CANCELLED', ['placed', 'cancelled'], 'cancelled'],
    ['EXPIRED', ['placed', 'expired'], 'expired'],
  ] as const)('represents %s without inventing another terminal branch', (status, ids, currentId) => {
    const timeline = buildCustomerOrderTimeline(detail(status));
    expect(timeline.map((item) => item.id)).toEqual(ids);
    expect(timeline.find((item) => item.id === currentId)?.state).toMatch(/current|terminal/);
  });

  it('uses only documented timestamps and explains stages without timestamps', () => {
    const timeline = buildCustomerOrderTimeline(detail('READY'));
    expect(timeline.find((item) => item.id === 'placed')?.timestamp).toBe('2026-09-29T05:00:00.000Z');
    expect(timeline.find((item) => item.id === 'confirmed')?.timestamp).toBe('2026-09-29T05:05:00.000Z');
    expect(timeline.find((item) => item.id === 'preparing')).toMatchObject({
      timestamp: undefined,
      detail: expect.stringContaining('does not provide a timestamp'),
    });
    expect(timeline.find((item) => item.id === 'ready')).toMatchObject({
      timestamp: undefined,
      detail: expect.stringContaining('does not provide a timestamp'),
    });
  });

  it('marks an elapsed pending expiry as stale without converting the status locally', () => {
    const timeline = buildCustomerOrderTimeline(detail('PENDING'), true);
    expect(timeline.at(-1)).toMatchObject({
      id: 'pending',
      label: 'Confirmation overdue',
      state: 'current',
    });
    expect(timeline.some((item) => item.id === 'expired')).toBe(false);
  });
});
