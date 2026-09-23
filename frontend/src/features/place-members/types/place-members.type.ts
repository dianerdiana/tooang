export type PlaceMemberRole = 'OWNER' | 'CASHIER';

export type PlaceMember = {
  membershipId: string;
  placeId: string;
  user: {
    userId: string;
    fullName: string;
    email: string;
  };
  role: PlaceMemberRole;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
};

export type SetPlaceMemberInput = { role: PlaceMemberRole };
export type SetCashierInput = { role: 'CASHIER' };
export type SetOwnerInput = { role: 'OWNER' };
export type PlaceMemberFormValues = { userId: string };
export type CashierFormValues = PlaceMemberFormValues;
