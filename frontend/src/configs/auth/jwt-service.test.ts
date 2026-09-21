import { describe, expect, it, vi } from 'vitest';

import { JwtService } from './jwt-service';

type PrivateClient = {
  axin: {
    getUri: (config: { url: string }) => string;
  };
  refreshClient: {
    post: ReturnType<typeof vi.fn>;
  };
};

describe('JwtService', () => {
  it.each(['/me', '/places', '/auth/login'])('resolves %s beneath exactly one API root', (path) => {
    const service = new JwtService({ baseURL: 'https://api.example.com/api/v1' });

    expect((service as unknown as PrivateClient).axin.getUri({ url: path })).toBe(
      `https://api.example.com/api/v1${path}`,
    );
  });

  it.each(['me', '//api.example.com/me', 'https://api.example.com/me', '/api/me', '/api/v1/me'])(
    'rejects a non-relative or API-prefixed request path (%s)',
    (path) => {
      const service = new JwtService({ baseURL: 'https://api.example.com/api/v1' });

      expect(() => service.get(path)).toThrow('API request path must be relative to /api/v1');
    },
  );

  it('shares one refresh request between concurrent callers', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const post = vi.fn().mockResolvedValue({
      data: {
        error: false,
        message: 'Token refreshed',
        data: { accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 900 },
      },
    });
    (service as unknown as PrivateClient).refreshClient.post = post;

    const [first, second] = await Promise.all([service.refreshAccessToken(), service.refreshAccessToken()]);

    expect(first).toBe('new-token');
    expect(second).toBe('new-token');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('clears the access token even when backend logout fails', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    service.setToken('token');
    (service as unknown as PrivateClient).refreshClient.post = vi.fn().mockRejectedValue(new Error('offline'));

    await expect(service.logout()).rejects.toThrow('offline');
    expect(service.getToken()).toBeNull();
  });
});
