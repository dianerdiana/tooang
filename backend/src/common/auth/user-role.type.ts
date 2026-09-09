export enum UserRoleEnum {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  User = 'USER',
}

export function isUserRoleEnum(value: unknown): value is UserRoleEnum {
  return typeof value === 'string' && Object.values(UserRoleEnum).includes(value as UserRoleEnum);
}
