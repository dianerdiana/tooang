import { BadRequestException, Injectable } from '@nestjs/common';

import { type AuditDbClient, type AuditRecordInput, AuditRepository } from './audit.repository';

export const AUDIT_ACTIONS = [
  'PLATFORM_ROLE_UPDATED',
  'USER_DEACTIVATED',
  'ACCOUNT_DELETION_REQUESTED',
  'PLACE_CREATED',
  'PLACE_MEMBER_ASSIGNED',
  'PLACE_MEMBER_REACTIVATED',
  'PLACE_MEMBER_ROLE_UPDATED',
  'PLACE_MEMBER_REVOKED',
  'ORDERING_SETTING_UPDATED',
  'ADMIN_CROSS_PLACE_MUTATION',
  'REVIEW_MODERATED',
  'ORDER_STATUS_UPDATED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditEventInput = Omit<AuditRecordInput, 'action'> & { action: AuditAction };

const FORBIDDEN_KEY =
  /(?:password|access.?token|refresh.?token|token.?hash|verification.?token|secret|private.?key)/i;

function containsForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  return Object.entries(value).some(
    ([key, child]) => FORBIDDEN_KEY.test(key) || containsForbiddenKey(child),
  );
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  append(data: AuditEventInput, db?: AuditDbClient) {
    if (!AUDIT_ACTIONS.some((action) => action === data.action)) {
      throw new BadRequestException('Unsupported audit action');
    }
    if (containsForbiddenKey(data.beforeData) || containsForbiddenKey(data.afterData)) {
      throw new BadRequestException('Sensitive data is not permitted in audit records');
    }
    return this.repository.append(data, db);
  }
}
