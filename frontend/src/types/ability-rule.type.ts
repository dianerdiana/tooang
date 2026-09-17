import type { MongoAbility, MongoQuery } from '@casl/ability';

import type { Permission } from './permission.type';

export type AbilitySubject = 'Platform' | 'Place';

export type PlaceSubject = {
  type: 'Place';
  placeId: string;
};

export type AbilityRule = {
  action: Permission;
  subject: AbilitySubject;
  conditions?: { placeId: string };
};

export type AppAbility = MongoAbility<[Permission, AbilitySubject | PlaceSubject], MongoQuery>;
