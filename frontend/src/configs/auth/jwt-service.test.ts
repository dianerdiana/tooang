import { describe, expect, it, vi } from 'vitest';

import { JwtService } from './jwt-service';

type AdapterConfig = {
  url?: string;
  _retry?: boolean;
  headers: Record<string, unknown> & { get?: (name: string) => unknown };
};

type PrivateClient = {
  axin: {
    defaults: { adapter?: ReturnType<typeof vi.fn>; withCredentials?: boolean };
    getUri: (config: { url: string }) => string;
  };
  refreshClient: {
    defaults: { withCredentials?: boolean };
    post: ReturnType<typeof vi.fn>;
  };
};

const refreshResponse = (accessToken = 'new-token') => ({
  data: {
    error: false,
    message: 'Token refreshed',
    data: { accessToken, tokenType: 'Bearer', expiresIn: 900 },
  },
});

const getAuthorization = (config: AdapterConfig) =>
  config.headers.get?.('Authorization') ?? config.headers.Authorization;

const rejectWithStatus = (config: AdapterConfig, status: number) =>
  Promise.reject({
    config,
    message: `Request failed with status code ${status}`,
    response: {
      config,
      data: { error: true, message: 'Unauthorized', code: 'UNAUTHORIZED' },
      headers: {},
      status,
      statusText: 'Unauthorized',
    },
  });

const successfulResponse = (config: AdapterConfig) => ({
  config,
  data: { error: false, message: 'ok', data: { ok: true } },
  headers: {},
  status: 200,
  statusText: 'OK',
});

const resolveSuccessfully = (config: AdapterConfig) => Promise.resolve(successfulResponse(config));

const privateClient = (service: JwtService) => service as unknown as PrivateClient;

describe('JwtService', () => {
  it.each(['/me', '/places', '/auth/login'])('resolves %s beneath exactly one API root', (path) => {
    const service = new JwtService({ baseURL: 'https://api.example.com/api/v1' });

    expect(privateClient(service).axin.getUri({ url: path })).toBe(`https://api.example.com/api/v1${path}`);
  });

  it.each(['me', '//api.example.com/me', 'https://api.example.com/me', '/api/me', '/api/v1/me'])(
    'rejects a non-relative or API-prefixed request path (%s)',
    (path) => {
      const service = new JwtService({ baseURL: 'https://api.example.com/api/v1' });

      expect(() => service.get(path)).toThrow('API request path must be relative to /api/v1');
    },
  );

  it('attaches the bearer token to a protected request', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const adapter = vi.fn((rawConfig: unknown) => resolveSuccessfully(rawConfig as AdapterConfig));
    privateClient(service).axin.defaults.adapter = adapter;
    service.setToken('access-token');

    await service.get('/me');

    const config = adapter.mock.calls[0]?.[0] as AdapterConfig;
    expect(getAuthorization(config)).toBe('Bearer access-token');
  });

  it.each(['/auth/login', '/auth/register', '/auth/refresh', '/auth/login/?redirect=/me'])(
    'does not attach a bearer token or refresh an excluded endpoint (%s)',
    async (endpoint) => {
      const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
      const adapter = vi.fn((rawConfig: unknown) => rejectWithStatus(rawConfig as AdapterConfig, 401));
      const refreshPost = vi.fn();
      privateClient(service).axin.defaults.adapter = adapter;
      privateClient(service).refreshClient.post = refreshPost;
      service.setToken('stale-token');

      await expect(service.post(endpoint)).rejects.toMatchObject({ response: { status: 401 } });

      const config = adapter.mock.calls[0]?.[0] as AdapterConfig;
      expect(getAuthorization(config)).toBeUndefined();
      expect(refreshPost).not.toHaveBeenCalled();
      expect(service.getToken()).toBe('stale-token');
    },
  );

  it.each([400, 403, 404, 409, 500])('does not refresh a protected request after a %i response', async (status) => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const adapter = vi.fn((rawConfig: unknown) => rejectWithStatus(rawConfig as AdapterConfig, status));
    const refreshPost = vi.fn();
    privateClient(service).axin.defaults.adapter = adapter;
    privateClient(service).refreshClient.post = refreshPost;
    service.setToken('access-token');

    await expect(service.get('/me')).rejects.toMatchObject({ response: { status } });
    expect(refreshPost).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledOnce();
  });

  it('treats /auth/me as an eligible protected path rather than a refresh endpoint', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const adapter = vi.fn((rawConfig: unknown) => {
      const config = rawConfig as AdapterConfig;
      return config._retry ? resolveSuccessfully(config) : rejectWithStatus(config, 401);
    });
    const refreshPost = vi.fn().mockResolvedValue(refreshResponse());
    privateClient(service).axin.defaults.adapter = adapter;
    privateClient(service).refreshClient.post = refreshPost;
    service.setToken('stale-token');

    await expect(service.get('/auth/me')).resolves.toMatchObject({ status: 200 });
    expect(refreshPost).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('refreshes once and retries the original request with the new token', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const authorizationHeaders: unknown[] = [];
    const adapter = vi.fn((rawConfig: unknown) => {
      const config = rawConfig as AdapterConfig;
      authorizationHeaders.push(getAuthorization(config));
      return config._retry ? resolveSuccessfully(config) : rejectWithStatus(config, 401);
    });
    const refreshPost = vi.fn().mockResolvedValue(refreshResponse());
    privateClient(service).axin.defaults.adapter = adapter;
    privateClient(service).refreshClient.post = refreshPost;
    service.setToken('stale-token');

    await expect(service.get('/me')).resolves.toMatchObject({ status: 200 });

    expect(refreshPost).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(authorizationHeaders).toEqual(['Bearer stale-token', 'Bearer new-token']);
    expect(service.getToken()).toBe('new-token');
  });

  it('does not refresh again when the retried request returns 401', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const adapter = vi.fn((rawConfig: unknown) => rejectWithStatus(rawConfig as AdapterConfig, 401));
    const refreshPost = vi.fn().mockResolvedValue(refreshResponse());
    const expired = vi.fn();
    privateClient(service).axin.defaults.adapter = adapter;
    privateClient(service).refreshClient.post = refreshPost;
    service.onSessionExpired(expired);
    service.setToken('stale-token');

    await expect(service.get('/me')).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshPost).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(service.getToken()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  });

  it('shares one refresh request between concurrent 401 responses', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const adapter = vi.fn((rawConfig: unknown) => {
      const config = rawConfig as AdapterConfig;
      return config._retry ? resolveSuccessfully(config) : rejectWithStatus(config, 401);
    });
    let resolveRefresh!: (value: ReturnType<typeof refreshResponse>) => void;
    const refresh = new Promise<ReturnType<typeof refreshResponse>>((resolve) => {
      resolveRefresh = resolve;
    });
    const refreshPost = vi.fn().mockReturnValue(refresh);
    privateClient(service).axin.defaults.adapter = adapter;
    privateClient(service).refreshClient.post = refreshPost;
    service.setToken('stale-token');

    const first = service.get('/me');
    const second = service.get('/places');
    await vi.waitFor(() => expect(refreshPost).toHaveBeenCalledOnce());
    resolveRefresh(refreshResponse());

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(refreshPost).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(4);
  });

  it('clears and expires the session once when a shared refresh fails', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const adapter = vi.fn((rawConfig: unknown) => rejectWithStatus(rawConfig as AdapterConfig, 401));
    let rejectRefresh!: (reason: Error) => void;
    const refresh = new Promise<never>((_resolve, reject) => {
      rejectRefresh = reject;
    });
    const refreshPost = vi.fn().mockReturnValue(refresh);
    const expired = vi.fn();
    privateClient(service).axin.defaults.adapter = adapter;
    privateClient(service).refreshClient.post = refreshPost;
    service.onSessionExpired(expired);
    service.setToken('stale-token');

    const first = service.get('/me');
    const second = service.get('/places');
    await vi.waitFor(() => expect(refreshPost).toHaveBeenCalledOnce());
    rejectRefresh(new Error('refresh failed'));

    const results = await Promise.allSettled([first, second]);
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(refreshPost).toHaveBeenCalledOnce();
    expect(service.getToken()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  });

  it('uses the credentialed cookie client for refresh without a request body', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    const post = vi.fn().mockResolvedValue(refreshResponse());
    privateClient(service).refreshClient.post = post;

    await service.refreshAccessToken();

    expect(privateClient(service).refreshClient.defaults.withCredentials).toBe(true);
    expect(post).toHaveBeenCalledWith('/auth/refresh');
  });

  it('clears the access token even when backend logout fails', async () => {
    const service = new JwtService({ baseURL: 'http://localhost/api/v1' });
    service.setToken('token');
    privateClient(service).refreshClient.post = vi.fn().mockRejectedValue(new Error('offline'));

    await expect(service.logout()).rejects.toThrow('offline');
    expect(service.getToken()).toBeNull();
  });
});
