export const MEDIA_TARGET = {
  PLACE_LOGO: 'PLACE_LOGO',
  PLACE_COVER: 'PLACE_COVER',
  MENU_ITEM_IMAGE: 'MENU_ITEM_IMAGE',
} as const;

export const MEDIA_MIME_TYPE = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  AVIF: 'image/avif',
} as const;

export const MAX_MEDIA_SIZE_BYTES = 5_242_880;
export const MEDIA_FILE_ACCEPT = Object.values(MEDIA_MIME_TYPE).join(',');

export type MediaTarget = (typeof MEDIA_TARGET)[keyof typeof MEDIA_TARGET];
export type MediaMimeType = (typeof MEDIA_MIME_TYPE)[keyof typeof MEDIA_MIME_TYPE];

export type MediaTargetIdentity =
  | { target: 'PLACE_LOGO' | 'PLACE_COVER'; placeId: string }
  | { target: 'MENU_ITEM_IMAGE'; placeId: string; menuItemId: string };

export type CreateUploadIntentInput = MediaTargetIdentity & {
  mimeType: MediaMimeType;
  sizeBytes: number;
};

export type MediaUploadAuthorization = {
  intentId: string;
  token: string;
  signature: string;
  expire: number;
  publicKey: string;
  uploadUrl: string;
  fileName: string;
  folder: string;
  useUniqueFileName: false;
  checks: string;
};

export type ImageKitUploadResult = { fileId: string };
export type CompleteUploadIntentInput = { fileId: string };
export type MediaAssociationResult = { imageUrl: string | null };
export type MediaUploadResult = MediaAssociationResult & { imageUrl: string };

export type MediaUploadPhase = 'idle' | 'authorizing' | 'uploading' | 'completing' | 'success' | 'error';
export type UploadProgressHandler = (percentage: number) => void;
