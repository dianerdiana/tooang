import { describe, expect, it } from 'vitest';

import {
  publicUserIdSchema,
  setPlaceMemberSchema,
  toCashierAssignment,
  toOwnerAssignment,
} from './place-members.schema';

describe('place-member schemas', () => {
  it('trims the public identifier and fixes the role to CASHIER', () => {
    expect(toCashierAssignment({ userId: '  usr_public_1  ' })).toEqual({
      userId: 'usr_public_1',
      input: { role: 'CASHIER' },
    });
  });

  it('creates an OWNER assignment and rejects unsupported or extra role payload fields', () => {
    expect(toOwnerAssignment({ userId: ' usr_owner ' })).toEqual({
      userId: 'usr_owner',
      input: { role: 'OWNER' },
    });
    expect(() => setPlaceMemberSchema.parse({ role: 'MANAGER' })).toThrow();
    expect(() => setPlaceMemberSchema.parse({ role: 'OWNER', custom: true })).toThrow();
  });

  it('rejects empty and oversized public identifiers', () => {
    expect(() => publicUserIdSchema.parse('   ')).toThrow();
    expect(() => publicUserIdSchema.parse('x'.repeat(101))).toThrow();
  });
});
