import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import ImageKit, { APIError } from '@imagekit/nodejs';

export type ImageKitFileDetails = {
  fileId?: string;
  filePath?: string;
  fileType?: string;
  mime?: string;
  name?: string;
  size?: number;
  url?: string;
};

@Injectable()
export class ImageKitService {
  readonly enabled: boolean;
  readonly publicKey?: string;
  readonly urlEndpoint?: string;
  readonly uploadFolder: string;
  private readonly client?: ImageKit;

  constructor(config: ConfigService) {
    this.enabled = config.get<boolean>('imageKit.enabled') ?? false;
    this.publicKey = config.get<string>('imageKit.publicKey');
    this.urlEndpoint = config.get<string>('imageKit.urlEndpoint');
    this.uploadFolder = config.get<string>('imageKit.uploadFolder') ?? '/tooang';
    const privateKey = config.get<string>('imageKit.privateKey');
    if (this.enabled && privateKey) {
      this.client = new ImageKit({ privateKey, logLevel: 'off', maxRetries: 0, timeout: 10_000 });
    }
  }

  authorize(token: string, expiresAt: Date) {
    this.assertEnabled();
    const auth = this.client!.helper.getAuthenticationParameters(
      token,
      Math.floor(expiresAt.getTime() / 1000),
    );
    return {
      ...auth,
      publicKey: this.publicKey!,
      uploadUrl: 'https://upload.imagekit.io/api/v1/files/upload',
    };
  }

  async getFile(fileId: string): Promise<ImageKitFileDetails> {
    this.assertEnabled();
    return this.client!.files.get(fileId);
  }

  async deleteFile(fileId: string): Promise<'deleted' | 'missing'> {
    this.assertEnabled();
    try {
      await this.client!.files.delete(fileId);
      return 'deleted';
    } catch (error) {
      if (error instanceof APIError && error.status === 404) return 'missing';
      throw error;
    }
  }

  async listFiles(path: string, limit = 100, skip = 0): Promise<ImageKitFileDetails[]> {
    this.assertEnabled();
    const assets = await this.client!.assets.list({ path, limit, skip, type: 'file' });
    return assets;
  }

  providerErrorCategory(error: unknown): string {
    if (error instanceof APIError) {
      if (error.status === 401 || error.status === 403) return 'authentication';
      if (error.status === 429) return 'rate_limit';
      if (error.status && error.status >= 500) return 'provider_unavailable';
      return 'provider_rejected';
    }
    return 'transport';
  }

  private assertEnabled(): void {
    if (!this.enabled || !this.client || !this.publicKey || !this.urlEndpoint) {
      throw new ServiceUnavailableException('Media service is unavailable');
    }
  }
}
