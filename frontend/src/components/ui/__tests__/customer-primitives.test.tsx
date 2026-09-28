import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { CustomerAlert } from '@/components/ui/customer-alert';
import {
  CUSTOMER_ORDER_STATUS,
  CustomerOrderStatusBadge,
  customerOrderStatusPresentation,
  PlaceOpenStateBadge,
  PlaceOrderingStateBadge,
} from '@/components/ui/customer-status-badge';
import { LiveRegion } from '@/components/ui/live-region';
import { QuantityControl } from '@/components/ui/quantity-control';
import { RatingDisplay, RatingInput } from '@/components/ui/rating';
import { ResponsiveImage } from '@/components/ui/responsive-image';
import { StickyMobileActionBar } from '@/components/ui/sticky-mobile-action-bar';

describe('responsive image', () => {
  it('reserves an aspect ratio and exposes an accessible fallback', () => {
    const markup = renderToStaticMarkup(<ResponsiveImage alt='Noodle bowl' fallbackLabel='No menu photo' />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Noodle bowl"');
    expect(markup).toContain('aspect-[4/3]');
    expect(markup).toContain('No menu photo');
  });

  it('renders a labeled skeleton while loading', () => {
    const markup = renderToStaticMarkup(<ResponsiveImage alt='Noodle bowl' loadingState />);
    expect(markup).toContain('aria-label="Loading image"');
    expect(markup).toContain('animate-pulse');
  });

  it('supports contained logos without changing reserved geometry', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveImage alt='Tooang logo' src='https://example.com/logo.png' fit='contain' />,
    );
    expect(markup).toContain('object-contain');
    expect(markup).toContain('aspect-[4/3]');
  });
});

describe('rating primitives', () => {
  it('announces the numeric rating and review count in addition to stars', () => {
    const markup = renderToStaticMarkup(<RatingDisplay value={4.3} reviewCount={27} />);
    expect(markup).toContain('aria-label="Rating: 4.3 out of 5, 27 reviews"');
    expect(markup).toContain('4.3');
    expect(markup).toContain('(27)');
  });

  it('uses labeled native radios with 44px targets and disabled state', () => {
    const markup = renderToStaticMarkup(
      <RatingInput name='rating' value={3} onValueChange={vi.fn()} disabled describedBy='rating-help' />,
    );
    expect(markup).toContain('<fieldset');
    expect(markup).toContain('aria-describedby="rating-help"');
    expect(markup).toContain('type="radio"');
    expect(markup).toContain('aria-label="5 out of 5 stars"');
    expect(markup).toContain('size-11');
    expect(markup).toContain('disabled=""');
  });
});

describe('quantity and messaging primitives', () => {
  it('labels both quantity actions, enforces the lower bound, and announces the value', () => {
    const markup = renderToStaticMarkup(<QuantityControl value={1} onValueChange={vi.fn()} />);
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Decrease quantity"');
    expect(markup).toContain('aria-label="Increase quantity"');
    expect(markup).toMatch(/aria-label="Decrease quantity"[^>]*disabled/);
    expect(markup).toContain('aria-live="polite"');
  });

  it('supports persistent and asynchronous customer messages', () => {
    const alert = renderToStaticMarkup(
      <CustomerAlert tone='error' title='Cart changed' description='Review the updated items.' live />,
    );
    const region = renderToStaticMarkup(<LiveRegion>Cart updated</LiveRegion>);
    expect(alert).toContain('role="alert"');
    expect(alert).toContain('aria-live="assertive"');
    expect(region).toContain('role="status"');
    expect(region).toContain('aria-live="polite"');
  });

  it('reserves mobile content space and applies safe-area spacing', () => {
    const markup = renderToStaticMarkup(<StickyMobileActionBar>Checkout</StickyMobileActionBar>);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('var(--safe-area-bottom)');
    expect(markup).toContain('aria-label="Page actions"');
  });
});

describe('customer status badges', () => {
  it('covers exactly the supported backend order statuses', () => {
    expect(Object.keys(customerOrderStatusPresentation)).toEqual(Object.values(CUSTOMER_ORDER_STATUS));
    expect(Object.keys(customerOrderStatusPresentation)).toHaveLength(7);

    for (const status of Object.values(CUSTOMER_ORDER_STATUS)) {
      const markup = renderToStaticMarkup(<CustomerOrderStatusBadge status={status} />);
      expect(markup).toContain('Order status:');
      expect(markup).toContain('<svg');
    }
  });

  it('distinguishes open, closed, and ordering-unavailable states with text and icons', () => {
    for (const state of ['OPEN', 'CLOSED', 'ORDERING_DISABLED'] as const) {
      const markup = renderToStaticMarkup(<PlaceOpenStateBadge state={state} />);
      expect(markup).toContain('Place status:');
      expect(markup).toContain('<svg');
    }
  });

  it('represents ordering independently from opening state', () => {
    const available = renderToStaticMarkup(<PlaceOrderingStateBadge enabled />);
    const unavailable = renderToStaticMarkup(<PlaceOrderingStateBadge enabled={false} />);

    expect(available).toContain('Ordering available');
    expect(available).toContain('aria-label="Ordering status: Ordering available"');
    expect(unavailable).toContain('Ordering unavailable');
    expect(unavailable).toContain('aria-label="Ordering status: Ordering unavailable"');
  });
});
