import { useState } from 'react';

import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { getSafeMutationError } from '@/utils/dashboard-error';

import { useDetachMediaMutation, useRefreshMediaTarget } from '../queries/media-association.mutation';
import type { MediaTargetIdentity } from '../types/media.type';

import { MediaUploadControl } from './media-upload-control';

const detachErrorMessage = (error: unknown) => {
  return getSafeMutationError(error, 'Unable to remove this image. Please try again.');
};

export function MediaManagementPanel({
  target,
  label,
  currentImageUrl,
  canUpload,
  canRemove,
}: {
  target: MediaTargetIdentity;
  label: string;
  currentImageUrl: string | null;
  canUpload: boolean;
  canRemove: boolean;
}) {
  const [visibleUrlOverride, setVisibleUrlOverride] = useState<string | null>();
  const detachMutation = useDetachMediaMutation(target);
  const refreshTarget = useRefreshMediaTarget();
  const visibleUrl = visibleUrlOverride === undefined ? currentImageUrl : visibleUrlOverride;

  const remove = async () => {
    try {
      const result = await detachMutation.mutateAsync();
      setVisibleUrlOverride(result.imageUrl);
    } catch (error) {
      toast.error(getSafeMutationError(error, 'Unable to remove this image. Please try again.'));
    }
  };

  return (
    <div className='space-y-3'>
      {canUpload ? (
        <MediaUploadControl
          target={target}
          label={label}
          currentImageUrl={visibleUrl}
          onUploaded={(result) => {
            setVisibleUrlOverride(result.imageUrl);
            void refreshTarget(target);
          }}
        />
      ) : (
        <div className='overflow-hidden rounded-md border bg-muted/30'>
          {visibleUrl ? (
            <img src={visibleUrl} alt={`${label} preview`} className='aspect-video w-full object-cover' />
          ) : (
            <div className='flex aspect-video items-center justify-center text-sm text-muted-foreground'>
              No {label.toLowerCase()}
            </div>
          )}
        </div>
      )}

      {canRemove && visibleUrl && (
        <ConfirmDialog
          title={`Remove ${label.toLowerCase()}?`}
          description='The association will be removed after backend confirmation. Provider cleanup may finish asynchronously.'
          confirmLabel={`Remove ${label.toLowerCase()}`}
          variant='destructive'
          isPending={detachMutation.isPending}
          onConfirm={() => void remove()}
          trigger={
            <Button type='button' variant='destructive' size='sm' disabled={detachMutation.isPending}>
              <Trash2Icon aria-hidden /> {detachMutation.isPending ? 'Removing…' : `Remove ${label.toLowerCase()}`}
            </Button>
          }
        />
      )}

      {detachMutation.isError && (
        <p role='alert' className='text-sm text-destructive'>
          {detachErrorMessage(detachMutation.error)}
        </p>
      )}
    </div>
  );
}

export { detachErrorMessage };
