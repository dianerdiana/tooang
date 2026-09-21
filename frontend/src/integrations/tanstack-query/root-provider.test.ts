import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { defaultQueryFn } from './root-provider';

describe('defaultQueryFn', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
  });

  it('requests an API-relative endpoint and unwraps the response', async () => {
    apiMock.get.mockResolvedValue({
      data: { error: false, message: 'Places retrieved', data: [{ id: 'place-one' }] },
    });

    await expect(defaultQueryFn({ queryKey: ['/places', { page: 1 }] } as never)).resolves.toEqual([
      { id: 'place-one' },
    ]);
    expect(apiMock.get).toHaveBeenCalledWith('/places', { params: { page: 1 } });
  });

  it('normalizes an invalid query key', async () => {
    await expect(defaultQueryFn({ queryKey: [{ resource: 'places' }] } as never)).rejects.toEqual({
      error: true,
      message: 'The first query key item must be an API-relative endpoint string',
    });
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  it('normalizes transport failures', async () => {
    apiMock.get.mockRejectedValue({
      isAxiosError: true,
      message: 'Network Error',
      code: 'ERR_NETWORK',
    });

    await expect(defaultQueryFn({ queryKey: ['/places'] } as never)).rejects.toMatchObject({
      error: true,
      code: 'ERR_NETWORK',
      isNetworkError: true,
    });
  });
});
