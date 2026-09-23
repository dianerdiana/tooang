import { describe, expect, it, vi } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { invalidateUsers } from './users.mutation';

describe('user mutations', () => {
  it('invalidates the complete users namespace after deactivation', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    await invalidateUsers(queryClient);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] });
  });
});
