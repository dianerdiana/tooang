import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Building2Icon, Loader2Icon, PencilIcon, PowerIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';

import { BusinessHoursPanel } from '@/features/business-hours/components/business-hours-page';

import { isApplicationError } from '@/utils/api-error.util';
import { canAtPlace } from '@/utils/auth/has-permission';
import { useAppAbility } from '@/utils/hooks/use-app-ability';

import { PERMISSION } from '@/types/permission.type';

import {
  useSetPlaceOrderingMutation,
  useSetPlacePublishingMutation,
  useUpdatePlaceMutation,
} from '../queries/places.mutation';
import { managementPlaceQueryOptions } from '../queries/places.query';
import { changedPlaceProfileFields, placeProfileSchema, placeToFormValues } from '../schemas/places.schema';
import {
  type NormalizedPlaceListParams,
  PLACE_TYPE,
  type PlaceProfileFormValues,
  type PlaceSummary,
  type PlaceType,
} from '../types/places.type';

type PlaceManagementPageProps = {
  placeId: string;
  platformContext?: boolean;
  listSearch?: NormalizedPlaceListParams;
};

type FieldErrors = Partial<Record<keyof PlaceProfileFormValues, string>>;

const placeTypeLabels: Record<PlaceType, string> = {
  RESTAURANT: 'Restaurant',
  CAFE: 'Cafe',
  FOOD_STALL: 'Food stall',
  OTHER: 'Other',
};

const firstErrorMessage = (errors: unknown[]) => {
  const error = errors[0];
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};

const displayValue = (value: string | number | null) =>
  value === null || value === '' ? <span className='text-muted-foreground'>Not provided</span> : value;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function DefinitionItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='space-y-1'>
      <dt className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>{label}</dt>
      <dd className='break-words text-sm'>{children}</dd>
    </div>
  );
}

function PlaceMedia({ place }: { place: PlaceSummary }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      {[
        { label: 'Logo', url: place.logoUrl, className: 'aspect-square max-w-48' },
        { label: 'Cover', url: place.coverUrl, className: 'aspect-video' },
      ].map((media) => (
        <div key={media.label} className='space-y-2'>
          <p className='text-sm font-medium'>{media.label}</p>
          {media.url ? (
            <img
              src={media.url}
              alt={`${place.name} ${media.label.toLowerCase()}`}
              className={`${media.className} w-full rounded-lg border bg-muted object-cover`}
            />
          ) : (
            <div
              className={`${media.className} flex w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground`}
            >
              No {media.label.toLowerCase()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AvailabilityStatus({ place }: { place: PlaceSummary }) {
  return (
    <div className='flex flex-wrap gap-2'>
      <StatusBadge tone={place.isPublished ? 'success' : 'neutral'} showDot>
        {place.isPublished ? 'Published' : 'Draft'}
      </StatusBadge>
      <StatusBadge tone={place.isOrderingEnabled ? 'primary' : 'neutral'} showDot>
        {place.isOrderingEnabled ? 'Ordering enabled' : 'Ordering disabled'}
      </StatusBadge>
    </div>
  );
}

const operationErrorMessage = (error: unknown, operation: 'publishing' | 'ordering') => {
  if (!isApplicationError(error)) return `Unable to update ${operation}. Please try again.`;
  if (error.httpStatus === 403) return `You no longer have permission to update ${operation}.`;
  if (error.httpStatus === 404) return 'This place is no longer available in your management scope.';
  if (error.isNetworkError) return `Could not reach the server to update ${operation}. Please try again.`;
  return error.message;
};

type PlaceAvailabilityControlsProps = {
  place: PlaceSummary;
  canPublish: boolean;
  canManageOrdering: boolean;
};

function PlaceAvailabilityControls({ place, canPublish, canManageOrdering }: PlaceAvailabilityControlsProps) {
  const publishing = useSetPlacePublishingMutation(place.id);
  const ordering = useSetPlaceOrderingMutation(place.id);
  const isPending = publishing.isPending || ordering.isPending;

  const changePublishing = async (isPublished: boolean) => {
    try {
      await publishing.mutateAsync({ isPublished });
      toast.success(isPublished ? 'Place published.' : 'Place unpublished. Ordering is disabled.');
    } catch {
      // The normalized mutation error is rendered with the publishing control.
    }
  };

  const changeOrdering = async (isOrderingEnabled: boolean) => {
    try {
      await ordering.mutateAsync({ isOrderingEnabled });
      toast.success(isOrderingEnabled ? 'Ordering enabled.' : 'Ordering disabled.');
    } catch {
      // The normalized mutation error is rendered with the ordering control.
    }
  };

  return (
    <SectionCard title='Availability' description='Publication and ordering are separate backend operations.'>
      <div className='space-y-5'>
        <AvailabilityStatus place={place} />

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-3 rounded-lg border p-4'>
            <div>
              <h3 className='font-semibold'>Publishing</h3>
              <p className='mt-1 text-sm text-muted-foreground'>
                {place.isPublished ? 'Customers can discover this place.' : 'This place is hidden from discovery.'}
              </p>
            </div>
            {publishing.isError && (
              <p role='alert' className='text-sm text-destructive'>
                {operationErrorMessage(publishing.error, 'publishing')}
              </p>
            )}
            {canPublish &&
              (place.isPublished ? (
                <ConfirmDialog
                  title={`Unpublish “${place.name}”?`}
                  description='The place will disappear from public discovery and ordering will also be disabled.'
                  confirmLabel='Unpublish place'
                  variant='destructive'
                  isPending={publishing.isPending}
                  onConfirm={() => void changePublishing(false)}
                  trigger={
                    <Button type='button' variant='outline' disabled={isPending}>
                      <PowerIcon aria-hidden />
                      Unpublish
                    </Button>
                  }
                />
              ) : (
                <Button type='button' onClick={() => void changePublishing(true)} disabled={isPending}>
                  <SendIcon aria-hidden />
                  {publishing.isPending ? 'Publishing…' : 'Publish place'}
                </Button>
              ))}
          </div>

          <div className='space-y-3 rounded-lg border p-4'>
            <div>
              <h3 className='font-semibold'>Ordering</h3>
              <p className='mt-1 text-sm text-muted-foreground'>
                {place.isOrderingEnabled ? 'Customers can submit new orders.' : 'Customers cannot submit new orders.'}
              </p>
            </div>
            {ordering.isError && (
              <p role='alert' className='text-sm text-destructive'>
                {operationErrorMessage(ordering.error, 'ordering')}
              </p>
            )}
            {canManageOrdering &&
              (place.isOrderingEnabled ? (
                <ConfirmDialog
                  title={`Disable ordering for “${place.name}”?`}
                  description='Customers will no longer be able to submit new orders. Existing orders are unaffected.'
                  confirmLabel='Disable ordering'
                  variant='destructive'
                  isPending={ordering.isPending}
                  onConfirm={() => void changeOrdering(false)}
                  trigger={
                    <Button type='button' variant='outline' disabled={isPending}>
                      <PowerIcon aria-hidden />
                      Disable ordering
                    </Button>
                  }
                />
              ) : (
                <Button type='button' onClick={() => void changeOrdering(true)} disabled={isPending}>
                  <PowerIcon aria-hidden />
                  {ordering.isPending ? 'Enabling…' : 'Enable ordering'}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function PlaceOverview({ place, availability }: { place: PlaceSummary; availability?: React.ReactNode }) {
  return (
    <div className='grid gap-5 xl:grid-cols-2'>
      <SectionCard title='Profile' description='Identity and customer-facing description.'>
        <dl className='grid gap-5 sm:grid-cols-2'>
          <DefinitionItem label='Name'>{place.name}</DefinitionItem>
          <DefinitionItem label='Type'>{placeTypeLabels[place.type]}</DefinitionItem>
          <DefinitionItem label='Slug'>/{place.slug}</DefinitionItem>
          <DefinitionItem label='Timezone'>{place.timezone}</DefinitionItem>
          <DefinitionItem label='Description'>{displayValue(place.description)}</DefinitionItem>
        </dl>
      </SectionCard>

      {availability ?? (
        <SectionCard title='Availability' description='Current read-only customer availability states.'>
          <AvailabilityStatus place={place} />
        </SectionCard>
      )}

      <SectionCard title='Location' description='Address and map coordinates.'>
        <dl className='grid gap-5 sm:grid-cols-2'>
          <DefinitionItem label='Address'>{place.address}</DefinitionItem>
          <DefinitionItem label='City'>{displayValue(place.city)}</DefinitionItem>
          <DefinitionItem label='Latitude'>{displayValue(place.latitude)}</DefinitionItem>
          <DefinitionItem label='Longitude'>{displayValue(place.longitude)}</DefinitionItem>
        </dl>
      </SectionCard>

      <SectionCard title='Contact' description='Customer contact channels.'>
        <dl className='grid gap-5 sm:grid-cols-2'>
          <DefinitionItem label='Phone'>{displayValue(place.phone)}</DefinitionItem>
          <DefinitionItem label='WhatsApp'>{displayValue(place.whatsapp)}</DefinitionItem>
        </dl>
      </SectionCard>

      <SectionCard title='Media' description='Current active place imagery.' className='xl:col-span-2'>
        <PlaceMedia place={place} />
      </SectionCard>

      <SectionCard title='Record information' className='xl:col-span-2'>
        <dl className='grid gap-5 sm:grid-cols-3'>
          <DefinitionItem label='Place ID'>{place.id}</DefinitionItem>
          <DefinitionItem label='Created'>{formatDateTime(place.createdAt)}</DefinitionItem>
          <DefinitionItem label='Last updated'>{formatDateTime(place.updatedAt)}</DefinitionItem>
        </dl>
      </SectionCard>
    </div>
  );
}

function PlaceProfileForm({
  place,
  onCancel,
  onSaved,
}: {
  place: PlaceSummary;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const mutation = useUpdatePlaceMutation(place.id);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string>();
  const form = useForm({
    defaultValues: placeToFormValues(place),
    validators: { onSubmit: placeProfileSchema },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setSubmissionError(undefined);
      const input = changedPlaceProfileFields(value, place);
      if (Object.keys(input).length === 0) return;

      try {
        await mutation.mutateAsync(input);
        toast.success('Place profile updated.');
        onSaved();
      } catch (error) {
        const normalized = error;
        if (!isApplicationError(normalized)) {
          setSubmissionError('Unable to update this place. Please try again.');
          return;
        }

        const supportedFields = new Set(Object.keys(placeToFormValues(place)));
        const nextFieldErrors: FieldErrors = {};
        for (const detail of normalized.details ?? []) {
          if (detail.field && supportedFields.has(detail.field)) {
            nextFieldErrors[detail.field as keyof PlaceProfileFormValues] = detail.message;
          }
        }
        setFieldErrors(nextFieldErrors);
        if (Object.keys(nextFieldErrors).length === 0 || normalized.message !== 'Validation failed') {
          setSubmissionError(normalized.message);
        }
      }
    },
  });

  const fieldError = (name: keyof PlaceProfileFormValues, errors: unknown[], touched: boolean) =>
    fieldErrors[name] ?? (touched ? firstErrorMessage(errors) : undefined);

  const clearServerError = (name: keyof PlaceProfileFormValues) =>
    setFieldErrors((current) => ({ ...current, [name]: undefined }));

  return (
    <SectionCard title='Edit profile' description='Update supported identity, location, and contact fields.'>
      <form
        className='grid gap-5'
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className='grid gap-5 sm:grid-cols-2'>
          <form.Field name='name' validators={{ onBlur: placeProfileSchema.shape.name }}>
            {(field) => (
              <FormField error={fieldError('name', field.state.meta.errors, field.state.meta.isTouched)}>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    value={field.state.value}
                    maxLength={120}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      clearServerError('name');
                      field.handleChange(event.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='slug' validators={{ onBlur: placeProfileSchema.shape.slug }}>
            {(field) => (
              <FormField error={fieldError('slug', field.state.meta.errors, field.state.meta.isTouched)}>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input
                    value={field.state.value}
                    maxLength={100}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      clearServerError('slug');
                      field.handleChange(event.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='type'>
            {(field) => (
              <FormField error={fieldErrors.type}>
                <FormLabel>Type</FormLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    clearServerError('type');
                    field.handleChange(value as PlaceType);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(PLACE_TYPE).map((type) => (
                      <SelectItem key={type} value={type}>
                        {placeTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='timezone' validators={{ onBlur: placeProfileSchema.shape.timezone }}>
            {(field) => (
              <FormField error={fieldError('timezone', field.state.meta.errors, field.state.meta.isTouched)}>
                <FormLabel>Timezone</FormLabel>
                <FormControl>
                  <Input
                    value={field.state.value}
                    placeholder='Asia/Jakarta'
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      clearServerError('timezone');
                      field.handleChange(event.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>
        </div>

        <form.Field name='description' validators={{ onBlur: placeProfileSchema.shape.description }}>
          {(field) => (
            <FormField error={fieldError('description', field.state.meta.errors, field.state.meta.isTouched)}>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <textarea
                  className='min-h-28 w-full rounded-md border border-input bg-form px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
                  value={field.state.value}
                  maxLength={2000}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    clearServerError('description');
                    field.handleChange(event.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormField>
          )}
        </form.Field>

        <div className='grid gap-5 sm:grid-cols-2'>
          {(['address', 'city', 'latitude', 'longitude', 'phone', 'whatsapp'] as const).map((name) => (
            <form.Field key={name} name={name} validators={{ onBlur: placeProfileSchema.shape[name] }}>
              {(field) => (
                <FormField
                  error={fieldError(name, field.state.meta.errors, field.state.meta.isTouched)}
                  className={name === 'address' ? 'sm:col-span-2' : undefined}
                >
                  <FormLabel>
                    {name === 'whatsapp' ? 'WhatsApp' : name.charAt(0).toUpperCase() + name.slice(1)}
                  </FormLabel>
                  <FormControl>
                    <Input
                      value={field.state.value}
                      inputMode={name === 'latitude' || name === 'longitude' ? 'decimal' : undefined}
                      maxLength={
                        name === 'address'
                          ? 500
                          : name === 'city'
                            ? 100
                            : name === 'phone' || name === 'whatsapp'
                              ? 30
                              : undefined
                      }
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        clearServerError(name);
                        field.handleChange(event.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormField>
              )}
            </form.Field>
          ))}
        </div>

        {submissionError && (
          <div role='alert' className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            {submissionError}
          </div>
        )}

        <div className='flex flex-wrap justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel} disabled={mutation.isPending}>
            Cancel
          </Button>
          <form.Subscribe selector={(state) => [state.values, state.canSubmit, state.isSubmitting] as const}>
            {([values, canSubmit, isSubmitting]) => {
              const hasChanges = (() => {
                try {
                  return Object.keys(changedPlaceProfileFields(values, place)).length > 0;
                } catch {
                  return false;
                }
              })();
              return (
                <Button type='submit' disabled={!canSubmit || !hasChanges || isSubmitting || mutation.isPending}>
                  {isSubmitting || mutation.isPending ? (
                    <>
                      <Loader2Icon className='animate-spin' aria-hidden />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
      </form>
    </SectionCard>
  );
}

function PlaceManagementPage({ placeId, platformContext = false, listSearch }: PlaceManagementPageProps) {
  const ability = useAppAbility();
  const query = useQuery(managementPlaceQueryOptions(placeId));
  const [isEditing, setIsEditing] = useState(false);

  if (query.isPending) {
    return (
      <div role='status' aria-label='Loading place details' className='space-y-5'>
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-72 w-full' />
        <Skeleton className='h-56 w-full' />
      </div>
    );
  }

  if (query.isError || !query.data) {
    const status = isApplicationError(query.error) ? query.error.httpStatus : undefined;
    return (
      <ErrorState
        title={status === 404 ? 'Place not found' : status === 403 ? 'Access denied' : 'Could not load place'}
        description={
          status === 404
            ? 'This place is unavailable or outside your access.'
            : status === 403
              ? 'You do not have permission to view this place.'
              : 'Try loading the place details again.'
        }
        onRetry={status === 403 || status === 404 ? undefined : () => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const place = query.data;
  const canEdit = canAtPlace(ability, place.id, PERMISSION.PLACE_UPDATE);
  const canPublish = canAtPlace(ability, place.id, PERMISSION.PLACE_PUBLISH);

  return (
    <>
      <PageHeader
        title={place.name}
        description={platformContext ? 'Platform place overview and profile.' : 'Place overview and profile settings.'}
        breadcrumbs={
          platformContext
            ? [
                {
                  id: 'places',
                  label: 'Places',
                  to: '/dashboard/platform/places',
                  search: listSearch ?? { page: 1, limit: 20 },
                },
                { id: 'place', label: place.name },
              ]
            : undefined
        }
        actions={
          !isEditing && canEdit ? (
            <Button onClick={() => setIsEditing(true)}>
              <PencilIcon aria-hidden />
              Edit profile
            </Button>
          ) : undefined
        }
        leading={
          <span className='flex size-11 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <Building2Icon aria-hidden />
          </span>
        }
      />
      {isEditing && canEdit ? (
        <PlaceProfileForm
          key={place.updatedAt}
          place={place}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      ) : (
        <PlaceOverview
          place={place}
          availability={<PlaceAvailabilityControls place={place} canPublish={canPublish} canManageOrdering={canEdit} />}
        />
      )}
      {platformContext && <BusinessHoursPanel placeId={place.id} timezone={place.timezone} canEdit={canEdit} />}
      {platformContext && (
        <Button asChild variant='outline'>
          <Link to='/dashboard/platform/places' search={listSearch ?? { page: 1, limit: 20 }}>
            Back to places
          </Link>
        </Button>
      )}
    </>
  );
}

export {
  AvailabilityStatus,
  PlaceAvailabilityControls,
  PlaceManagementPage,
  type PlaceManagementPageProps,
  PlaceOverview,
  PlaceProfileForm,
};
