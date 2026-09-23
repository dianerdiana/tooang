import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  delete: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
}));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { diningTablesService } from '@/features/dining-tables/services/dining-tables.service';
import { menuCategoriesService } from '@/features/menu-categories/services/menu-categories.service';
import { ordersService } from '@/features/orders/services/orders.service';
import { placeMembersService } from '@/features/place-members/services/place-members.service';
import { placesService } from '@/features/places/services/places.service';
import { usersService } from '@/features/users/services/users.service';

import { PlatformRole } from '@/types/enums/user-role.enum';

type MockMethod = keyof typeof apiMock;

const operations: { label: string; method: MockMethod; run: () => Promise<unknown> }[] = [
  {
    label: 'place update',
    method: 'patch',
    run: () => placesService.update('place-1', { name: 'Updated Place' }),
  },
  {
    label: 'publishing toggle',
    method: 'patch',
    run: () => placesService.setPublishing('place-1', { isPublished: false }),
  },
  {
    label: 'ordering toggle',
    method: 'patch',
    run: () => placesService.setOrdering('place-1', { isOrderingEnabled: false }),
  },
  {
    label: 'dining-table mutation',
    method: 'patch',
    run: () => diningTablesService.update('place-1', 'table-1', { isActive: false }),
  },
  {
    label: 'menu mutation',
    method: 'patch',
    run: () => menuCategoriesService.update('place-1', 'category-1', { isActive: false }),
  },
  {
    label: 'CASHIER membership mutation',
    method: 'put',
    run: () => placeMembersService.setCashier('place-1', 'user-1', { role: 'CASHIER' }),
  },
  {
    label: 'order status transition',
    method: 'patch',
    run: () => ordersService.transitionForPlace('place-1', 'order-1', { status: 'CONFIRMED' }),
  },
  {
    label: 'user deactivation',
    method: 'delete',
    run: () => usersService.deactivate('user-1'),
  },
  {
    label: 'platform-role mutation',
    method: 'put',
    run: () => usersService.updatePlatformRole('user-1', { platformRole: PlatformRole.ADMIN }),
  },
  {
    label: 'OWNER membership mutation',
    method: 'put',
    run: () => placeMembersService.setOwner('place-1', 'user-1', { role: 'OWNER' }),
  },
];

const statusCode = { 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT' } as const;

const transportError = (status: keyof typeof statusCode) => ({
  isAxiosError: true,
  message: `Request failed with status code ${status}`,
  response: {
    status,
    data: {
      error: true,
      message: status === 409 ? 'The resource changed before this operation completed' : 'Request denied',
      code: statusCode[status],
    },
  },
});

describe('high-risk management operation failures', () => {
  beforeEach(() => Object.values(apiMock).forEach((mock) => mock.mockReset()));

  for (const operation of operations) {
    it.each([403, 404, 409] as const)(`normalizes %i for ${operation.label}`, async (status) => {
      apiMock[operation.method].mockRejectedValueOnce(transportError(status));

      await expect(operation.run()).rejects.toMatchObject({
        error: true,
        code: statusCode[status],
        httpStatus: status,
        isNetworkError: false,
      });
    });
  }
});
