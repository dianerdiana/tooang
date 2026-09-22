import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

import type { OrderSummary } from '../types/order.type';

import {
  DashboardOverview,
  OrderStatusBadge,
  PlaceOverviewContext,
  PlatformOverviewContext,
  RecentOrdersList,
} from './dashboard-overview';

const place: PlaceMembership = {
  placeId: 'place-1',
  place: { name: 'Warung Tooang', isPublished: false, isOrderingEnabled: false },
  role: PlaceMemberRole.OWNER,
  permissions: [],
  effectivePermissions: [],
};

const order: OrderSummary = {
  orderId: 'order-1',
  orderCode: 'TNG-20260922-ABCDEFGH',
  place: { placeId: 'place-1', name: 'Warung Tooang' },
  status: 'READY',
  fulfillmentType: 'DINE_IN',
  customerName: 'Customer Name',
  diningTableName: 'Table 4',
  subtotal: 45000,
  createdAt: '2026-09-22T05:00:00.000Z',
  statusUpdatedAt: '2026-09-22T05:10:00.000Z',
  expiresAt: '2026-09-22T05:15:00.000Z',
};

describe('dashboard overview presentation', () => {
  it('shows selected-place identity and configuration blockers', () => {
    const markup = renderToStaticMarkup(<PlaceOverviewContext membership={place} />);

    expect(markup).toContain('Warung Tooang');
    expect(markup).toContain('OWNER membership');
    expect(markup).toContain('Draft');
    expect(markup).toContain('Ordering disabled');
    expect(markup).toContain('This place is still a draft. Customer ordering is disabled.');
  });

  it('renders an explicit platform context', () => {
    const markup = renderToStaticMarkup(<PlatformOverviewContext />);

    expect(markup).toContain('Platform');
    expect(markup).toContain('Global management context');
  });

  it('shows platform identity without requesting unsupported order data', () => {
    const platformUser: AuthenticatedUser = {
      userId: 'admin-1',
      fullName: 'Platform Admin',
      email: 'admin@example.com',
      platformRole: PlatformRole.ADMIN,
      permissions: [PERMISSION.USER_READ],
      globalPermissions: [PERMISSION.USER_READ],
      placeMemberships: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const queryClient = new QueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <DashboardOverview user={platformUser} selectedPlace={null} />
      </QueryClientProvider>,
    );

    expect(markup).toContain('Platform');
    expect(markup).toContain('Order overview unavailable');
    expect(markup).not.toContain('Loading recent orders');
  });

  it('renders supported recent-order fields and semantic status text', () => {
    const markup = renderToStaticMarkup(<RecentOrdersList orders={[order]} isPlatform />);
    const badgeMarkup = renderToStaticMarkup(<OrderStatusBadge status='READY' />);

    expect(markup).toContain(order.orderCode);
    expect(markup).toContain(order.customerName);
    expect(markup).toContain(order.place.name);
    expect(markup).toContain('Dine in · Table 4');
    expect(markup).toContain('45.000');
    expect(badgeMarkup).toContain('Ready');
  });
});
