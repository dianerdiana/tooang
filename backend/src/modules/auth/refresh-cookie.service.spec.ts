import { ConfigService } from '@nestjs/config';

import { RefreshCookieService } from './refresh-cookie.service';

describe('RefreshCookieService', () => {
  it.each([true, false])('uses the complete cookie contract when secure=%s', (secure) => {
    const service = new RefreshCookieService(
      new ConfigService({ security: { refreshCookieSecure: secure } }),
    );
    expect(service.options()).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/api/v1/auth',
    });
    expect(service.options()).not.toHaveProperty('domain');
  });
});
