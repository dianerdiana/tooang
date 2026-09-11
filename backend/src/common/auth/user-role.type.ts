export enum UserRoleEnum {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  Owner = 'OWNER',
  User = 'USER',
}

export function isUserRoleEnum(value: unknown): value is UserRoleEnum {
  return typeof value === 'string' && Object.values(UserRoleEnum).includes(value as UserRoleEnum);
}

export function isUserRoleEnumArray(value: unknown): value is UserRoleEnum[] {
  return Array.isArray(value) && value.length > 0 && value.every(isUserRoleEnum);
}
