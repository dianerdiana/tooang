import type { MongoAbility, MongoQuery } from '@casl/ability';

import type { PermissionIdentifier } from './permission.type';

export type AbilitySubject = 'Platform' | 'Place';

export type PlaceSubject = {
  type: 'Place';
  placeId: string;
};

export type AbilityRule = {
  action: PermissionIdentifier;
  subject: AbilitySubject;
  conditions?: { placeId: string };
};

export type AppAbility = MongoAbility<[PermissionIdentifier, AbilitySubject | PlaceSubject], MongoQuery>;
