import { describe, expect, it } from 'vitest';

import { publicUserIdSchema, toCashierAssignment } from './place-members.schema';

describe('place-member schemas', () => {
  it('trims the public identifier and fixes the role to CASHIER', () => {
    expect(toCashierAssignment({ userId: '  usr_public_1  ' })).toEqual({
      userId: 'usr_public_1',
      input: { role: 'CASHIER' },
    });
  });

  it('rejects empty and oversized public identifiers', () => {
    expect(() => publicUserIdSchema.parse('   ')).toThrow();
    expect(() => publicUserIdSchema.parse('x'.repeat(101))).toThrow();
  });
});
