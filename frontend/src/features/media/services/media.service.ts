import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

import { completeUploadIntentSchema, createUploadIntentSchema } from '../schemas/media.schema';
import type {
  CompleteUploadIntentInput,
  CreateUploadIntentInput,
  MediaAssociationResult,
  MediaUploadAuthorization,
  MediaUploadResult,
} from '../types/media.type';

export const mediaService = {
  async createUploadIntent(input: CreateUploadIntentInput): Promise<MediaUploadAuthorization> {
    try {
      const body = createUploadIntentSchema.parse(input) as CreateUploadIntentInput;
      const response = await api.post<CreateUploadIntentInput, ApiResponse<{ upload: MediaUploadAuthorization }>>(
        '/media/upload-intents',
        body,
      );
      return unwrapApiResponse(response.data).upload;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async completeUploadIntent(intentId: string, input: CompleteUploadIntentInput): Promise<MediaUploadResult> {
    try {
      const body = completeUploadIntentSchema.parse(input);
      const response = await api.post<CompleteUploadIntentInput, ApiResponse<{ media: MediaUploadResult }>>(
        `/media/upload-intents/${encodeURIComponent(intentId)}/complete`,
        body,
      );
      return unwrapApiResponse(response.data).media;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async detachPlaceLogo(placeId: string): Promise<MediaAssociationResult> {
    try {
      const response = await api.delete<ApiResponse<{ media: MediaAssociationResult }>>(
        `/places/${encodeURIComponent(placeId)}/media/logo`,
      );
      return unwrapApiResponse(response.data).media;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async detachPlaceCover(placeId: string): Promise<MediaAssociationResult> {
    try {
      const response = await api.delete<ApiResponse<{ media: MediaAssociationResult }>>(
        `/places/${encodeURIComponent(placeId)}/media/cover`,
      );
      return unwrapApiResponse(response.data).media;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async detachMenuItemImage(placeId: string, menuItemId: string): Promise<MediaAssociationResult> {
    try {
      const response = await api.delete<ApiResponse<{ media: MediaAssociationResult }>>(
        `/places/${encodeURIComponent(placeId)}/menu-items/${encodeURIComponent(menuItemId)}/image`,
      );
      return unwrapApiResponse(response.data).media;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
