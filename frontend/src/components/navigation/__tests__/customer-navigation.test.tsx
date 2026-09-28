import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import {
  CartCountBadge,
  formatCartCount,
  getActiveCustomerDestination,
  getContextualCart,
  getLogicalBackHref,
  getUserInitials,
} from '../customer-navigation';

describe('customer navigation model', () => {
  it.each([
    ['/places/warung-kita', '/'],
    ['/places/warung-kita/menu', '/places/warung-kita'],
    ['/places/warung-kita/cart', '/places/warung-kita/menu'],
    ['/places/warung-kita/checkout', '/places/warung-kita/cart'],
    ['/orders/01954b22-ec4e-7aa4-8cb7-91e30b718f30', '/orders'],
    ['/account/reviews', '/account/profile'],
    ['/verify/token', '/'],
  ])('maps %s to its logical parent', (pathname, expected) => {
    expect(getLogicalBackHref(pathname)).toBe(expected);
  });

  it('does not add a back affordance to top-level destinations', () => {
    expect(getLogicalBackHref('/')).toBeNull();
    expect(getLogicalBackHref('/orders')).toBeNull();
    expect(getLogicalBackHref('/account/profile')).toBeNull();
  });

  it('preserves discovery context when returning from a place detail', () => {
    expect(getLogicalBackHref('/places/warung-kita', '?page=2&search=noodles&type=CAFE')).toBe(
      '/?page=2&search=noodles&type=CAFE',
    );
    expect(getLogicalBackHref('/places/warung-kita/menu', '?page=2')).toBe('/places/warung-kita?page=2');
  });

  it('offers a cart only in a selected place or menu context', () => {
    expect(getContextualCart('/places/warung-kita')).toEqual({
      slug: 'warung-kita',
      href: '/places/warung-kita/cart',
      itemCount: undefined,
    });
    expect(getContextualCart('/places/warung-kita/menu', 3)).toEqual({
      slug: 'warung-kita',
      href: '/places/warung-kita/cart',
      itemCount: 3,
    });
    expect(getContextualCart('/orders')).toBeNull();
    expect(getContextualCart('/places/warung-kita/cart')).toBeNull();
  });

  it.each([
    ['/', 'discover'],
    ['/places/warung-kita/menu', 'discover'],
    ['/orders', 'orders'],
    ['/orders/order-id', 'orders'],
    ['/account/profile', 'account'],
  ])('marks the active destination for %s', (pathname, expected) => {
    expect(getActiveCustomerDestination(pathname)).toBe(expected);
  });

  it('hides zero cart badges and caps the visible count', () => {
    expect(renderToStaticMarkup(<CartCountBadge count={0} />)).toBe('');
    expect(renderToStaticMarkup(<CartCountBadge count={3} />)).toContain('>3<');
    expect(renderToStaticMarkup(<CartCountBadge count={120} />)).toContain('>99+<');
    expect(formatCartCount(100)).toBe('99+');
  });

  it('creates deterministic initials without relying on an avatar feature', () => {
    expect(getUserInitials('Dian Erdiana')).toBe('DE');
    expect(getUserInitials('  Dian  ')).toBe('D');
    expect(getUserInitials('')).toBe('U');
  });
});
