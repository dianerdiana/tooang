import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { placesService } from '../places.service';

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
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.get.mockResolvedValue(response);
  });

  it('creates a place through the documented endpoint', async () => {
    const place = { id: 'place-new', name: 'New Place', isPublished: false };
    const input = {
      name: 'New Place',
      slug: 'new-place',
      type: 'RESTAURANT' as const,
      address: 'Address',
      timezone: 'Asia/Jakarta',
    };
    apiMock.post.mockResolvedValueOnce({
      data: { error: false, message: 'Place created', data: { place } },
    });

    await expect(placesService.create(input)).resolves.toEqual(place);
    expect(apiMock.post).toHaveBeenCalledWith('/places', input);
  });

  it('loads the public list through the exact endpoint with normalized supported filters', async () => {
    const publicResponse = {
      data: {
        error: false as const,
        message: 'Places retrieved',
        data: { places: [{ id: 'place-1', name: 'Tooang Cafe', slug: 'tooang-cafe', type: 'CAFE' }] },
        meta: { page: 2, limit: 12, totalItems: 13, totalPages: 2 },
      },
    };
    apiMock.get.mockResolvedValueOnce(publicResponse);

    await expect(
      placesService.listPublic({ page: 2, limit: 12, search: '  coffee ', city: ' Bandung ', type: 'CAFE' }),
    ).resolves.toEqual({ places: publicResponse.data.data.places, meta: publicResponse.data.meta });

    expect(apiMock.get).toHaveBeenCalledWith('/places', {
      params: { page: 2, limit: 12, search: 'coffee', type: 'CAFE', city: 'Bandung' },
    });
  });

  it('loads a normalized public slug detail with seven-day hours and isOpen', async () => {
    const place = {
      id: 'place-1',
      name: 'Tooang Cafe',
      slug: 'tooang-cafe',
      type: 'CAFE',
      businessHours: Array.from({ length: 7 }, (_, index) => ({
        day: index === 0 ? 'MONDAY' : 'TUESDAY',
        isClosed: true,
        opensAt: null,
        closesAt: null,
      })),
      isOpen: false,
    };
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Place retrieved', data: { place } },
    });

    await expect(placesService.getPublic('  TOOANG-CAFE ')).resolves.toEqual(place);
    expect(apiMock.get).toHaveBeenCalledWith('/places/tooang-cafe');
  });

  it('loads management details by ID and updates only the provided fields', async () => {
    const place = { id: 'place-1', name: 'Tooang Cafe' };
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Management place retrieved', data: { place } },
    });
    apiMock.patch.mockResolvedValueOnce({
      data: { error: false, message: 'Place updated', data: { place } },
    });

    await expect(placesService.getManagement('place-1')).resolves.toEqual(place);
    await expect(placesService.update('place-1', { name: 'Tooang Cafe' })).resolves.toEqual(place);

    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/management');
    expect(apiMock.patch).toHaveBeenCalledWith('/places/place-1', { name: 'Tooang Cafe' });
  });

  it('uses distinct publishing and ordering operations', async () => {
    const published = { id: 'place-1', isPublished: true, isOrderingEnabled: false };
    const ordering = { id: 'place-1', isPublished: true, isOrderingEnabled: true };
    apiMock.patch
      .mockResolvedValueOnce({
        data: { error: false, message: 'Place publishing updated', data: { place: published } },
      })
      .mockResolvedValueOnce({
        data: { error: false, message: 'Place ordering updated', data: { place: ordering } },
      });

    await expect(placesService.setPublishing('place-1', { isPublished: true })).resolves.toEqual(published);
    await expect(placesService.setOrdering('place-1', { isOrderingEnabled: true })).resolves.toEqual(ordering);

    expect(apiMock.patch).toHaveBeenNthCalledWith(1, '/places/place-1/publishing', { isPublished: true });
    expect(apiMock.patch).toHaveBeenNthCalledWith(2, '/places/place-1/ordering', { isOrderingEnabled: true });
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

  it('normalizes public failures for customer error handling', async () => {
    apiMock.get.mockRejectedValue(new Error('Places unavailable'));
    await expect(placesService.listPublic({})).rejects.toMatchObject({
      error: true,
      message: 'Places unavailable',
      code: 'APPLICATION_ERROR',
      isNetworkError: false,
    });
  });
});
