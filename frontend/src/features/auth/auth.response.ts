import type { UserData } from '@/types/user-data.type';

export type LoginResponse = {
  token: string;
  user: UserData;
};
