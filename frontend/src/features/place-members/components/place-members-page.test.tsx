import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { MembersTable, type PlaceMemberPermissions } from './place-members-page';

const member = (role: 'OWNER' | 'CASHIER') => ({
  membershipId: `membership-${role}`,
  placeId: 'place-1',
  user: {
    userId: `public-${role.toLowerCase()}`,
    fullName: role === 'OWNER' ? 'Owner Person' : 'Cashier Person',
    email: `${role.toLowerCase()}@example.com`,
  },
  role,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  revokedAt: null,
});
const permissions = (canRevokeCashier: boolean): PlaceMemberPermissions => ({
  canRead: true,
  canAssignCashier: false,
  canRevokeCashier,
  canAssignOwner: false,
  canRevokeOwner: false,
});

const onChangeRole = () => undefined;

describe('place member table', () => {
  it('renders only safe identity and membership presentation fields', () => {
    const markup = renderToStaticMarkup(
      <MembersTable
        members={[member('CASHIER')]}
        permissions={permissions(false)}
        onRevoke={() => undefined}
        onChangeRole={onChangeRole}
      />,
    );
    expect(markup).toContain('Cashier Person');
    expect(markup).toContain('cashier@example.com');
    expect(markup).toContain('public-cashier');
    expect(markup).toContain('Cashier');
    expect(markup).not.toContain('membership-CASHIER');
    expect(markup).not.toContain('Revoke');
  });

  it('offers revocation only for CASHIER rows with effective permission', () => {
    const cashier = renderToStaticMarkup(
      <MembersTable
        members={[member('CASHIER')]}
        permissions={permissions(true)}
        onRevoke={() => undefined}
        onChangeRole={onChangeRole}
      />,
    );
    const owner = renderToStaticMarkup(
      <MembersTable
        members={[member('OWNER')]}
        permissions={permissions(true)}
        onRevoke={() => undefined}
        onChangeRole={onChangeRole}
      />,
    );
    expect(cashier).toContain('Revoke');
    expect(owner).not.toContain('Revoke');
  });

  it('renders exactly the self-only collection supplied by the backend', () => {
    const markup = renderToStaticMarkup(
      <MembersTable
        members={[member('CASHIER')]}
        permissions={permissions(false)}
        onRevoke={() => undefined}
        onChangeRole={onChangeRole}
      />,
    );
    expect(markup).toContain('Cashier Person');
    expect(markup).not.toContain('Owner Person');
  });

  it('keeps OWNER operations separate and exclusive to OWNER capabilities', () => {
    const cashierOnly = renderToStaticMarkup(
      <MembersTable
        members={[member('OWNER'), member('CASHIER')]}
        permissions={{ ...permissions(true), canAssignCashier: true }}
        onRevoke={() => undefined}
        onChangeRole={onChangeRole}
      />,
    );
    const superAdmin = renderToStaticMarkup(
      <MembersTable
        members={[member('OWNER'), member('CASHIER')]}
        permissions={{
          ...permissions(true),
          canAssignCashier: true,
          canAssignOwner: true,
          canRevokeOwner: true,
        }}
        onRevoke={() => undefined}
        onChangeRole={onChangeRole}
      />,
    );

    expect(cashierOnly).not.toContain('Promote to owner');
    expect(cashierOnly).not.toContain('Change to cashier');
    expect(superAdmin).toContain('Promote to owner');
    expect(superAdmin).toContain('Change to cashier');
    expect(superAdmin).toContain('Revoke');
  });
});
