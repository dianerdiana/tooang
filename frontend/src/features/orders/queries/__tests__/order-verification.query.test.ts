import { describe, expect, it, vi } from 'vitest';

import { ordersService } from '../../services/orders.service';
import { publicOrderVerificationKeys, publicOrderVerificationQueryOptions } from '../order-verification.query';

describe('public order verification query', () => {
  const token = `${'A'.repeat(42)}_`;

  it('uses an isolated, case-sensitive public namespace', () => {
    expect(publicOrderVerificationKeys.detail(token)).toEqual(['orders', 'public-verification', token]);
    expect(publicOrderVerificationKeys.detail(token)).not.toEqual(
      publicOrderVerificationKeys.detail(token.toLowerCase()),
    );
  });

  it('keeps verification transient and avoids automatic retries or polling', () => {
    const options = publicOrderVerificationQueryOptions(token);
    expect(options.enabled).toBe(true);
    expect(options.gcTime).toBe(0);
    expect(options.staleTime).toBe(0);
    expect(options.retry).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchInterval).toBe(false);
  });

  it('disables malformed tokens and forwards valid values without normalization', async () => {
    expect(publicOrderVerificationQueryOptions('malformed').enabled).toBe(false);
    const getVerification = vi.spyOn(ordersService, 'getPublicVerification').mockResolvedValue({
      orderCode: 'TNG-1',
      placeName: 'Place',
      status: 'PENDING',
      fulfillmentType: 'TAKEAWAY',
      createdAt: '2026-09-30T10:00:00.000Z',
      expiresAt: '2026-09-30T10:15:00.000Z',
      statusUpdatedAt: '2026-09-30T10:00:00.000Z',
    });

    await publicOrderVerificationQueryOptions(token).queryFn?.({} as never);
    expect(getVerification).toHaveBeenCalledWith(token);
  });
});
