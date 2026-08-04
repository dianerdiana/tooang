import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { OrderDetail } from '../types/order.type';

import {
  getCancellationReasonState,
  OrderActions,
  OrderDetailView,
  type OrderTransitionPermissions,
  resolveAvailableTransitions,
} from './order-detail-drawer';

const detail = (status: OrderDetail['status'] = 'CONFIRMED'): OrderDetail => ({
  orderId: 'order-1',
  orderCode: 'TNG-20260923-ABCDEFGH',
  place: { placeId: 'place-1', name: 'Warung Tooang' },
  status,
  fulfillmentType: 'DINE_IN',
  customerName: 'Ayu',
  diningTableName: 'Patio 4',
  subtotal: 50000,
  createdAt: '2026-09-23T05:00:00.000Z',
  statusUpdatedAt: '2026-09-23T05:10:00.000Z',
  expiresAt: '2026-09-23T05:15:00.000Z',
  customerNote: 'No cutlery',
  cancellationReason: status === 'CANCELLED' ? 'Kitchen closed' : null,
  diningTable: { tableId: 'table-1', name: 'Patio 4' },
  confirmedAt: '2026-09-23T05:05:00.000Z',
  completedAt: status === 'COMPLETED' ? '2026-09-23T05:20:00.000Z' : null,
  cancelledAt: status === 'CANCELLED' ? '2026-09-23T05:12:00.000Z' : null,
  items: [
    {
      menuItemId: 'item-1',
      itemName: 'Nasi Goreng Snapshot',
      itemType: 'FOOD',
      unitPrice: 25000,
      quantity: 2,
      note: 'Extra spicy',
      lineTotal: 50000,
    },
  ],
});

const allPermissions: OrderTransitionPermissions = {
  canConfirm: true,
  canPrepare: true,
  canMarkReady: true,
  canComplete: true,
  canCancel: true,
};

describe('operational order details', () => {
  it('renders authenticated snapshots, notes, fulfillment, totals, and returned timestamps', () => {
    const markup = renderToStaticMarkup(<OrderDetailView order={detail()} />);

    expect(markup).toContain('Warung Tooang');
    expect(markup).toContain('Ayu');
    expect(markup).toContain('Patio 4');
    expect(markup).toContain('No cutlery');
    expect(markup).toContain('Nasi Goreng Snapshot');
    expect(markup).toContain('Extra spicy');
    expect(markup).toContain(`2 ${'\u00d7'}`);
    expect(markup).toContain('50.000');
    expect(markup).toContain('Confirmed');
    expect(markup).not.toContain('verificationToken');
  });

  it('shows terminal state and cancellation information without actions', () => {
    const order = detail('CANCELLED');
    const view = renderToStaticMarkup(<OrderDetailView order={order} />);
    const actions = renderToStaticMarkup(
      <OrderActions order={order} permissions={allPermissions} pending={false} onTransition={async () => true} />,
    );

    expect(view).toContain('Terminal order');
    expect(view).toContain('Kitchen closed');
    expect(actions).toContain('No actions available');
    expect(actions).not.toContain('Cancel order');
  });

  it('selects only transitions allowed by current state and effective permission', () => {
    expect(resolveAvailableTransitions('PENDING', allPermissions).map(({ target }) => target)).toEqual([
      'CONFIRMED',
      'CANCELLED',
    ]);
    expect(
      resolveAvailableTransitions('CONFIRMED', { ...allPermissions, canPrepare: false }).map(({ target }) => target),
    ).toEqual(['CANCELLED']);
    expect(
      resolveAvailableTransitions('READY', { ...allPermissions, canCancel: false }).map(({ target }) => target),
    ).toEqual(['COMPLETED']);
    expect(resolveAvailableTransitions('EXPIRED', allPermissions)).toEqual([]);
  });

  it('normalizes and validates cancellation reasons according to the current state', () => {
    expect(getCancellationReasonState('PENDING', '')).toMatchObject({ required: false, invalid: false });
    expect(getCancellationReasonState('CONFIRMED', '  ')).toMatchObject({ required: true, invalid: true });
    expect(getCancellationReasonState('CONFIRMED', ' Cafe\u0301\r\nclosed ')).toMatchObject({
      normalized: `Caf${'\u00e9'}\nclosed`,
      invalid: false,
    });
    expect(getCancellationReasonState('READY', 'a'.repeat(501))).toMatchObject({ length: 501, invalid: true });
  });
});
