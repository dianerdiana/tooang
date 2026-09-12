export enum PlatformRoleEnum {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  User = 'USER',
}

export enum PlaceMemberRoleEnum {
  Owner = 'OWNER',
  Cashier = 'CASHIER',
}

export function isPlatformRole(value: unknown): value is PlatformRoleEnum {
  return (
    typeof value === 'string' && Object.values(PlatformRoleEnum).includes(value as PlatformRoleEnum)
  );
}
