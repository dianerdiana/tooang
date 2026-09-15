import { createHash, randomUUID } from 'node:crypto';

import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { MediaTargetType, Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';
import {
  PlaceAccessService,
  type ResolvedPlaceAccess,
} from '@/modules/places/place-access.service';

import {
  type ImageKitFileDetails,
  ImageKitService,
  PrismaService,
  WinstonLoggerService,
} from '../../lib';

import { MediaRepository } from './media.repository';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  type CreateUploadIntentInput,
  MAX_MEDIA_SIZE_BYTES,
} from './media.schema';
import { MediaCleanupService } from './media-cleanup.service';

const UPLOAD_TTL_MS = 5 * 60_000;
const UPLOAD_CHECKS = `"file.size" <= ${MAX_MEDIA_SIZE_BYTES} AND "file.mime" IN [${ALLOWED_MEDIA_MIME_TYPES.map((type) => `"${type}"`).join(',')}]`;

@Injectable()
export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly access: PlaceAccessService,
    private readonly imageKit: ImageKitService,
    private readonly cleanup: MediaCleanupService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async createIntent(actor: AuthenticatedActor, input: CreateUploadIntentInput) {
    this.assertProviderEnabled();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);
    const fileName = `${randomUUID()}.${this.extension(input.mimeType)}`;
    const folder = this.targetFolder(input);
    const filePath = `${folder}/${fileName}`;

    const intent = await this.prisma.$transaction(
      async (tx) => {
        await this.assertTarget(actor, input.placeId, input.target, input.menuItemId ?? null, tx);
        return this.repository.createIntent(
          {
            actorUserId: actor.id,
            placeId: input.placeId,
            ...(input.menuItemId ? { menuItemId: input.menuItemId } : {}),
            target: input.target,
            providerTokenHash: createHash('sha256').update(token).digest('hex'),
            expectedFileName: fileName,
            expectedFilePath: filePath,
            expectedMimeType: input.mimeType,
            expectedSizeBytes: input.sizeBytes,
            expiresAt,
          },
          tx,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const auth = this.imageKit.authorize(token, expiresAt);

    return {
      intentId: intent.id,
      token: auth.token,
      signature: auth.signature,
      expire: auth.expire,
      publicKey: auth.publicKey,
      uploadUrl: auth.uploadUrl,
      fileName,
      folder,
      useUniqueFileName: false,
      checks: UPLOAD_CHECKS,
    };
  }

  async complete(actor: AuthenticatedActor, intentId: string, fileId: string) {
    this.assertProviderEnabled();
    const initial = await this.repository.findIntent(intentId, actor.id);
    if (!initial) throw new ConflictException('Upload intent is invalid');
    if (initial.completedAsset) return this.assetResponse(initial.completedAsset);
    if (initial.expiresAt.getTime() <= Date.now())
      throw new ConflictException('Upload intent has expired');

    let remote: ImageKitFileDetails;
    try {
      remote = await this.imageKit.getFile(fileId);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const category = this.imageKit.providerErrorCategory(error);
      if (category === 'provider_rejected') {
        throw new ConflictException('Uploaded media could not be verified');
      }
      throw new BadGatewayException('Media provider verification failed');
    }
    if (!this.matchesIntent(initial, fileId, remote)) {
      if (remote.filePath === initial.expectedFilePath && remote.fileId) {
        try {
          await this.imageKit.deleteFile(remote.fileId);
        } catch (error) {
          this.logger.warn('Rejected media upload compensation failed', {
            intentId,
            operation: 'delete_rejected_upload',
            providerCategory: this.imageKit.providerErrorCategory(error),
          });
        }
      }
      throw new ConflictException('Uploaded media does not match the upload intent');
    }

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const intent = await this.repository.findIntent(intentId, actor.id, tx);
          if (!intent) throw new ConflictException('Upload intent is invalid');
          if (intent.completedAsset) return { asset: intent.completedAsset, oldAssetId: null };
          if (intent.expiresAt.getTime() <= Date.now())
            throw new ConflictException('Upload intent has expired');
          const access = await this.assertTarget(
            actor,
            intent.placeId,
            intent.target,
            intent.menuItemId,
            tx,
          );
          const asset = await this.repository.createAsset(
            {
              imageKitFileId: fileId,
              deliveryUrl: remote.url!,
              deliveryPath: remote.filePath!,
              mimeType: remote.mime!,
              sizeBytes: remote.size!,
            },
            tx,
          );
          const oldAssetId = await this.repository.switchAssociation(
            intent.target,
            intent.placeId,
            intent.menuItemId,
            asset.id,
            tx,
          );
          if (oldAssetId) await this.repository.queueAsset(oldAssetId, new Date(), tx);
          await this.repository.consumeIntent(intent.id, asset.id, new Date(), tx);
          await this.auditGlobal(
            actor,
            access,
            intent.placeId,
            asset.id,
            'MEDIA_ASSOCIATION_REPLACED',
            tx,
          );
          return { asset, oldAssetId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (result.oldAssetId) await this.cleanup.processAsset(result.oldAssetId);
      return this.assetResponse(result.asset);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        const completed = await this.repository.findIntent(intentId, actor.id);
        if (completed?.completedAsset) return this.assetResponse(completed.completedAsset);
        throw new ConflictException('Concurrent media change; retry the request');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2025')
      ) {
        const completed = await this.repository.findIntent(intentId, actor.id);
        if (completed?.completedAsset) return this.assetResponse(completed.completedAsset);
        throw new ConflictException('Provider file is already associated');
      }
      throw error;
    }
  }

  removePlaceMedia(
    actor: AuthenticatedActor,
    placeId: string,
    target: 'PLACE_LOGO' | 'PLACE_COVER',
  ) {
    return this.removeAssociation(actor, placeId, target, null);
  }

  removeMenuItemMedia(actor: AuthenticatedActor, placeId: string, menuItemId: string) {
    return this.removeAssociation(actor, placeId, MediaTargetType.MENU_ITEM_IMAGE, menuItemId);
  }

  private async removeAssociation(
    actor: AuthenticatedActor,
    placeId: string,
    target: MediaTargetType,
    menuItemId: string | null,
  ) {
    this.assertProviderEnabled();
    try {
      const assetId = await this.prisma.$transaction(
        async (tx) => {
          const access = await this.assertTarget(actor, placeId, target, menuItemId, tx, true);
          const detached = await this.repository.detachAssociation(target, placeId, menuItemId, tx);
          if (detached === undefined) throw new NotFoundException('Media target not found');
          if (!detached) return null;
          await this.repository.queueAsset(detached, new Date(), tx);
          await this.auditGlobal(actor, access, placeId, detached, 'MEDIA_ASSOCIATION_REMOVED', tx);
          return detached;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (assetId) await this.cleanup.processAsset(assetId);
      return { imageUrl: null };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Concurrent media change; retry the request');
      }
      throw error;
    }
  }

  private async assertTarget(
    actor: AuthenticatedActor,
    placeId: string,
    target: MediaTargetType,
    menuItemId: string | null,
    tx: Prisma.TransactionClient,
    deleting = false,
  ): Promise<ResolvedPlaceAccess> {
    if (!(await this.repository.findActiveActor(actor.id, tx))) {
      throw new NotFoundException('Media target not found');
    }
    const permission = deleting ? PERMISSION.MEDIA_DELETE : PERMISSION.MEDIA_UPLOAD;
    const access = await this.access.assertPermission(actor, placeId, permission, tx);
    if (target === MediaTargetType.MENU_ITEM_IMAGE) {
      if (!menuItemId || !(await this.repository.findActiveMenuItem(placeId, menuItemId, tx))) {
        throw new NotFoundException('Media target not found');
      }
    } else if (menuItemId) {
      throw new NotFoundException('Media target not found');
    }
    return access;
  }

  private matchesIntent(
    intent: {
      expectedFileName: string;
      expectedFilePath: string;
      expectedMimeType: string;
      expectedSizeBytes: number;
    },
    fileId: string,
    file: ImageKitFileDetails,
  ): boolean {
    const endpoint = `${this.imageKit.urlEndpoint}/`;
    return (
      file.fileId === fileId &&
      file.fileType === 'image' &&
      file.name === intent.expectedFileName &&
      file.filePath === intent.expectedFilePath &&
      file.mime === intent.expectedMimeType &&
      ALLOWED_MEDIA_MIME_TYPES.includes(file.mime as (typeof ALLOWED_MEDIA_MIME_TYPES)[number]) &&
      file.size === intent.expectedSizeBytes &&
      file.size <= MAX_MEDIA_SIZE_BYTES &&
      typeof file.url === 'string' &&
      file.url.startsWith(endpoint)
    );
  }

  private targetFolder(input: CreateUploadIntentInput): string {
    const base = `${this.imageKit.uploadFolder}/places/${input.placeId}`;
    if (input.target === MediaTargetType.PLACE_LOGO) return `${base}/logo`;
    if (input.target === MediaTargetType.PLACE_COVER) return `${base}/cover`;
    return `${base}/menu-items/${input.menuItemId}`;
  }

  private extension(mime: (typeof ALLOWED_MEDIA_MIME_TYPES)[number]): string {
    return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[
      mime
    ];
  }

  private assetResponse(asset: { deliveryUrl: string }) {
    return { imageUrl: asset.deliveryUrl };
  }

  private assertProviderEnabled(): void {
    if (!this.imageKit.enabled)
      throw new ServiceUnavailableException('Media service is unavailable');
  }

  private async auditGlobal(
    actor: AuthenticatedActor,
    access: ResolvedPlaceAccess,
    placeId: string,
    targetId: string,
    operation: string,
    tx: Prisma.TransactionClient,
  ) {
    if (access.source !== 'platform') return;
    await this.audit.append(
      {
        actorUserId: actor.id,
        action: 'ADMIN_CROSS_PLACE_MUTATION',
        targetType: 'MediaAsset',
        targetId,
        afterData: {
          operation,
          permission: access.permission,
          placeId,
          changedFields: ['imageUrl'],
        },
      },
      tx,
    );
  }
}
