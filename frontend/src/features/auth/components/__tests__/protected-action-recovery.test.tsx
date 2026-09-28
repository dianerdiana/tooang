import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { ProtectedActionRecoveryNotice } from '../protected-action-recovery';

describe('protected action recovery messaging', () => {
  it('explains a restored draft without exposing an automatic mutation control', () => {
    const markup = renderToStaticMarkup(
      <ProtectedActionRecoveryNotice
        result={{
          status: 'consumed',
          intent: {
            version: 1,
            id: '92f3f96b-c1ee-4d74-97cb-e0230767276b',
            kind: 'add-to-cart',
            payload: {
              placeId: '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae',
              placeSlug: 'warung-kita',
              menuItemId: '8f95e179-a74f-46e0-aea8-e796a297c667',
              quantity: 2,
              note: 'Mild',
            },
            returnTo: '/places/warung-kita/menu',
            createdAt: 1,
            expiresAt: 900_001,
          },
        }}
      />,
    );

    expect(markup).toContain('Your item draft was restored');
    expect(markup).toContain('choose Add to cart when you are ready');
    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('<form');
  });

  it('explains a discarded context mismatch and renders nothing when no intent exists', () => {
    expect(renderToStaticMarkup(<ProtectedActionRecoveryNotice result={{ status: 'mismatch' }} />)).toContain(
      'Nothing was submitted',
    );
    expect(renderToStaticMarkup(<ProtectedActionRecoveryNotice result={{ status: 'missing' }} />)).toBe('');
  });
});
