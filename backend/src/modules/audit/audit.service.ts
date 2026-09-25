import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { type AuditDbClient, type AuditRecordInput, AuditRepository } from './audit.repository';

export const AUDIT_ACTIONS = [
  'USER_CREATED',
  'PLATFORM_ROLE_UPDATED',
  'USER_DEACTIVATED',
  'ACCOUNT_DELETION_REQUESTED',
  'ACCOUNT_ANONYMIZED',
  'PLACE_CREATED',
  'PLACE_MEMBER_ASSIGNED',
  'PLACE_MEMBER_REACTIVATED',
  'PLACE_MEMBER_ROLE_UPDATED',
  'PLACE_MEMBER_REVOKED',
  'ORDERING_SETTING_UPDATED',
  'ADMIN_CROSS_PLACE_MUTATION',
  'REVIEW_MODERATED',
  'ORDER_STATUS_UPDATED',
  'RETENTION_CLEANUP_COMPLETED',
] as const;

export const AUDIT_TARGET_TYPES = [
  'User',
  'Place',
  'PlaceMember',
  'DiningTable',
  'MenuCategory',
  'MenuItem',
  'MediaAsset',
  'Order',
  'PlaceReview',
  'MenuItemReview',
  'DataRetentionJob',
] as const;

export const SYSTEM_AUDIT_ACTORS = [
  'account-anonymization-worker',
  'retention-cleanup-worker',
  'order-expiry-worker',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];
export type SystemAuditActor = (typeof SYSTEM_AUDIT_ACTORS)[number];
export type AuditActor =
  { kind: 'USER'; userId: string } | { kind: 'SYSTEM'; id: SystemAuditActor };

type AuditEventFields = {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
};

export type AuditEventInput = AuditEventFields & { actor: AuditActor };

const MAX_AUDIT_JSON_BYTES = 16 * 1024;
const MAX_AUDIT_DEPTH = 8;
const FORBIDDEN_KEY = new RegExp(
  'authorization|cookie|password|access.?token|refresh.?token|session.?token|' +
    'token.?hash|verification.?(token|code)|secret|credential|api.?key|private.?key|' +
    'provider.?response',
  'iu',
);
const FORBIDDEN_VALUE = new RegExp(
  'Bearer\\s+\\S+|eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+|' +
    '\\/order-verifications\\/[^\\s/?#]+',
  'iu',
);

export class UnsafeAuditDataError extends Error {
  constructor(message = 'Unsafe audit data') {
    super(message);
    this.name = 'UnsafeAuditDataError';
  }
}

function validateJson(value: unknown, seen: Set<object>, depth: number): void {
  if (depth > MAX_AUDIT_DEPTH) throw new UnsafeAuditDataError('Audit data is too deeply nested');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    if (FORBIDDEN_VALUE.test(value)) throw new UnsafeAuditDataError();
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new UnsafeAuditDataError('Audit data contains a non-finite number');
    }
    return;
  }
  if (typeof value !== 'object') throw new UnsafeAuditDataError('Audit data is not JSON-safe');
  if (seen.has(value)) throw new UnsafeAuditDataError('Audit data contains a cycle');
  if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) {
    throw new UnsafeAuditDataError('Audit data contains an unsupported object');
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) validateJson(item, seen, depth + 1);
  } else {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key)) throw new UnsafeAuditDataError();
      validateJson(child, seen, depth + 1);
    }
  }
  seen.delete(value);
}

function validateAuditData(value: Prisma.InputJsonValue | undefined): void {
  if (value === undefined) return;
  validateJson(value, new Set(), 0);
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_AUDIT_JSON_BYTES) {
    throw new UnsafeAuditDataError('Audit data is too large');
  }
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  append(event: AuditEventInput, db?: AuditDbClient) {
    return this.repository.append(this.toRecord(event), db);
  }

  appendMany(events: AuditEventInput[], db: AuditDbClient) {
    return this.repository.appendMany(
      events.map((event) => this.toRecord(event)),
      db,
    );
  }

  private toRecord(event: AuditEventInput): AuditRecordInput {
    validateAuditData(event.beforeData);
    validateAuditData(event.afterData);
    if (!AUDIT_ACTIONS.includes(event.action)) {
      throw new UnsafeAuditDataError('Unsupported audit action');
    }
    if (!AUDIT_TARGET_TYPES.includes(event.targetType)) {
      throw new UnsafeAuditDataError('Unsupported audit target type');
    }
    if (!event.targetId || event.targetId.length > 255) {
      throw new UnsafeAuditDataError('Invalid audit target ID');
    }
    const auditActor = event.actor;
    if (
      (auditActor.kind === 'USER' && (!auditActor.userId || auditActor.userId.length > 255)) ||
      (auditActor.kind === 'SYSTEM' && !SYSTEM_AUDIT_ACTORS.includes(auditActor.id))
    ) {
      throw new UnsafeAuditDataError('Invalid audit actor');
    }
    const actor =
      auditActor.kind === 'USER'
        ? { actorType: 'USER' as const, actorUserId: auditActor.userId }
        : { actorType: 'SYSTEM' as const, systemActor: auditActor.id };
    return {
      ...actor,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      ...(event.beforeData === undefined ? {} : { beforeData: event.beforeData }),
      ...(event.afterData === undefined ? {} : { afterData: event.afterData }),
    };
  }
}
