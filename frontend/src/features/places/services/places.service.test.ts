import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { placesService } from './places.service';

const response = {
  data: {
    error: false,
    message: 'Management places retrieved',
    data: { places: [] },
    meta: { page: 2, limit: 20, totalItems: 25, totalPages: 2 },
  },
};

describe('placesService', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue(response);
  });

  it('sends only normalized documented management filters', async () => {
    await expect(
      placesService.listManagement({ page: 2, search: '  Bandung ', city: ' Bandung ', type: 'CAFE' }),
    ).resolves.toEqual({ places: [], meta: response.data.meta });

    expect(apiMock.get).toHaveBeenCalledWith('/places/management', {
      params: { page: 2, limit: 20, search: 'Bandung', type: 'CAFE', city: 'Bandung' },
    });
  });

  it('normalizes failures for page error handling', async () => {
    apiMock.get.mockRejectedValue(new Error('Places unavailable'));
    await expect(placesService.listManagement({})).rejects.toMatchObject({
      error: true,
      message: 'Places unavailable',
      code: 'APPLICATION_ERROR',
      isNetworkError: false,
    });
  });
});
