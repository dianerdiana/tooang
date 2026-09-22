import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { businessHoursService } from './business-hours.service';

describe('businessHoursService', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.put.mockReset();
  });

  it('loads the fixed weekly schedule from the documented route', async () => {
    const businessHours = [{ day: 'MONDAY', isClosed: true, opensAt: null, closesAt: null }];
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Business hours retrieved', data: { businessHours } },
    });

    await expect(businessHoursService.list('place-1')).resolves.toEqual(businessHours);
    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/business-hours');
  });

  it('updates exactly one day with the backend-aligned payload', async () => {
    const input = { isClosed: false as const, opensAt: '22:00', closesAt: '02:00' };
    const businessHour = { day: 'FRIDAY', ...input };
    apiMock.put.mockResolvedValueOnce({
      data: { error: false, message: 'Business hours updated', data: { businessHour } },
    });

    await expect(businessHoursService.update('place-1', 'FRIDAY', input)).resolves.toEqual(businessHour);
    expect(apiMock.put).toHaveBeenCalledWith('/places/place-1/business-hours/FRIDAY', input);
  });
});
