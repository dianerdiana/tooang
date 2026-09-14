import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type AuditDbClient = PrismaService | Prisma.TransactionClient;

export type AuditRecordInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(data: AuditRecordInput, db: AuditDbClient = this.prisma) {
    return db.auditLog.create({ data });
  }
}
