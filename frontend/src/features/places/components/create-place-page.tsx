import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { Building2Icon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { isApplicationError } from '@/utils/api-error.util';

import { useCreatePlaceMutation } from '../queries/places.mutation';
import { createPlaceFormSchema, defaultCreatePlaceValues, normalizeCreatePlaceInput } from '../schemas/places.schema';
import {
  type NormalizedPlaceListParams,
  PLACE_TYPE,
  type PlaceCreateFormValues,
  type PlaceType,
} from '../types/places.type';

type CreatePlacePageProps = {
  listSearch: NormalizedPlaceListParams;
};

type FieldErrors = Partial<Record<keyof PlaceCreateFormValues, string>>;

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

function CreatePlacePage({ listSearch }: CreatePlacePageProps) {
  const navigate = useNavigate();
  const mutation = useCreatePlaceMutation();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string>();
  const form = useForm({
    defaultValues: defaultCreatePlaceValues,
    validators: { onSubmit: createPlaceFormSchema },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setSubmissionError(undefined);

      try {
        const place = await mutation.mutateAsync(normalizeCreatePlaceInput(value));
        toast.success('Place created as a draft.');
        await navigate({
          to: '/dashboard/platform/places/$placeId',
          params: { placeId: place.id },
          search: listSearch,
          replace: true,
        });
      } catch (error) {
        if (!isApplicationError(error)) {
          setSubmissionError('Unable to create this place. Please try again.');
          return;
        }

        const supportedFields = new Set(Object.keys(defaultCreatePlaceValues));
        const nextFieldErrors: FieldErrors = {};
        for (const detail of error.details ?? []) {
          if (detail.field && supportedFields.has(detail.field)) {
            nextFieldErrors[detail.field as keyof PlaceCreateFormValues] = detail.message;
          }
        }
        setFieldErrors(nextFieldErrors);
        if (Object.keys(nextFieldErrors).length === 0 || error.message !== 'Validation failed') {
          setSubmissionError(
            error.httpStatus === 403 ? 'You no longer have permission to create places.' : error.message,
          );
        }
      }
    },
  });

  const fieldError = (name: keyof PlaceCreateFormValues, errors: unknown[], touched: boolean) =>
    fieldErrors[name] ?? (touched ? firstErrorMessage(errors) : undefined);

  const clearServerError = (name: keyof PlaceCreateFormValues) =>
    setFieldErrors((current) => ({ ...current, [name]: undefined }));

  return (
    <>
      <PageHeader
        title='Create place'
        description='Create an unpublished place and become its initial owner.'
        breadcrumbs={[
          { id: 'places', label: 'Places', to: '/dashboard/platform/places', search: listSearch },
          { id: 'create', label: 'Create place' },
        ]}
        leading={
          <span className='flex size-11 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <Building2Icon aria-hidden />
          </span>
        }
      />

      <SectionCard title='Place profile' description='Publishing and ordering are configured after creation.'>
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
            <form.Field name='name' validators={{ onBlur: createPlaceFormSchema.shape.name }}>
              {(field) => (
                <FormField error={fieldError('name', field.state.meta.errors, field.state.meta.isTouched)}>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      value={field.state.value}
                      maxLength={120}
                      autoFocus
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

            <form.Field name='slug' validators={{ onBlur: createPlaceFormSchema.shape.slug }}>
              {(field) => (
                <FormField error={fieldError('slug', field.state.meta.errors, field.state.meta.isTouched)}>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      value={field.state.value}
                      maxLength={100}
                      placeholder='my-place'
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

            <form.Field name='timezone' validators={{ onBlur: createPlaceFormSchema.shape.timezone }}>
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

          <form.Field name='description' validators={{ onBlur: createPlaceFormSchema.shape.description }}>
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
              <form.Field key={name} name={name} validators={{ onBlur: createPlaceFormSchema.shape[name] }}>
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
            <Button asChild type='button' variant='outline'>
              <Link to='/dashboard/platform/places' search={listSearch}>
                Cancel
              </Link>
            </Button>
            <form.Subscribe selector={(state) => [state.values, state.canSubmit, state.isSubmitting] as const}>
              {([values, canSubmit, isSubmitting]) => (
                <Button
                  type='submit'
                  disabled={
                    !canSubmit || !createPlaceFormSchema.safeParse(values).success || isSubmitting || mutation.isPending
                  }
                >
                  {isSubmitting || mutation.isPending ? (
                    <>
                      <Loader2Icon className='animate-spin' aria-hidden /> Creating…
                    </>
                  ) : (
                    'Create place'
                  )}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </SectionCard>
    </>
  );
}

export { CreatePlacePage, type CreatePlacePageProps };
