import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { Clock3Icon, Loader2Icon, LockIcon, MoonStarIcon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel } from '@/components/forms/form-field';
import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { managementPlaceQueryOptions } from '@/features/places/queries/places.query';

import { canAtPlace } from '@/utils/auth/has-permission';
import { getDashboardErrorPresentation, getDashboardErrorTone, getSafeMutationError } from '@/utils/dashboard-error';
import { useAppAbility } from '@/utils/hooks/use-app-ability';

import { PERMISSION } from '@/types/permission.type';

import { useUpdateBusinessHourMutation } from '../queries/business-hours.mutation';
import { businessHoursQueryOptions } from '../queries/business-hours.query';
import { businessHourToFormValues, isOvernightRange, toBusinessHourInput } from '../schemas/business-hours.schema';
import type { BusinessHour, DayOfWeek } from '../types/business-hours.type';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const updateErrorMessage = (error: unknown) => {
  return getSafeMutationError(error, 'Unable to save this day. Please try again.');
};

function ReadOnlyHour({ hour }: { hour: BusinessHour }) {
  if (hour.isClosed) return <span className='font-medium text-muted-foreground'>Closed</span>;
  const overnight = isOvernightRange(hour.opensAt ?? '', hour.closesAt ?? '');
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='font-medium tabular-nums'>
        {hour.opensAt}–{hour.closesAt}
      </span>
      {overnight && (
        <Badge variant='outline' className='gap-1 text-muted-foreground'>
          <MoonStarIcon aria-hidden /> Overnight · closes next day
        </Badge>
      )}
    </div>
  );
}

function BusinessHourRow({ placeId, hour, canEdit }: { placeId: string; hour: BusinessHour; canEdit: boolean }) {
  const mutation = useUpdateBusinessHourMutation(placeId, hour.day);
  const [validationError, setValidationError] = useState<string>();
  const form = useForm({
    defaultValues: businessHourToFormValues(hour),
    onSubmit: async ({ value }) => {
      setValidationError(undefined);
      const parsed = (() => {
        try {
          return toBusinessHourInput(value);
        } catch (error) {
          if (error && typeof error === 'object' && 'issues' in error) {
            const issues = (error as { issues?: { message?: string }[] }).issues;
            setValidationError(issues?.[0]?.message ?? 'Check the opening and closing times.');
          } else {
            setValidationError('Check the opening and closing times.');
          }
          return null;
        }
      })();
      if (!parsed) return;

      try {
        await mutation.mutateAsync(parsed);
        toast.success(`${DAY_LABELS[hour.day]} hours saved.`);
      } catch {
        // The normalized mutation error is rendered within this independent row.
      }
    },
  });

  if (!canEdit) {
    return (
      <div className='grid gap-2 px-4 py-4 sm:grid-cols-[9rem_1fr] sm:items-center sm:px-5'>
        <p className='font-semibold'>{DAY_LABELS[hour.day]}</p>
        <ReadOnlyHour hour={hour} />
      </div>
    );
  }

  return (
    <form
      className='grid gap-4 px-4 py-4 sm:grid-cols-[8rem_7rem_minmax(0,1fr)_auto] sm:items-start sm:px-5'
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <p className='pt-2 font-semibold'>{DAY_LABELS[hour.day]}</p>
      <form.Field name='isClosed'>
        {(field) => (
          <Button
            type='button'
            variant={field.state.value ? 'outline' : 'secondary'}
            role='switch'
            aria-checked={!field.state.value}
            aria-label={`${DAY_LABELS[hour.day]} is ${field.state.value ? 'closed' : 'open'}`}
            className='w-full'
            onClick={() => {
              setValidationError(undefined);
              field.handleChange(!field.state.value);
            }}
            disabled={mutation.isPending}
          >
            {field.state.value ? 'Closed' : 'Open'}
          </Button>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.values] as const}>
        {([values]) => (
          <div className='min-w-0 space-y-2'>
            <div className='grid grid-cols-[1fr_auto_1fr] items-end gap-2'>
              <form.Field name='opensAt'>
                {(field) => (
                  <FormField error={validationError && !values.isClosed ? validationError : undefined}>
                    <FormLabel>Opens</FormLabel>
                    <FormControl>
                      <Input
                        type='time'
                        step={60}
                        value={field.state.value}
                        disabled={values.isClosed || mutation.isPending}
                        onChange={(event) => {
                          setValidationError(undefined);
                          field.handleChange(event.target.value);
                        }}
                      />
                    </FormControl>
                  </FormField>
                )}
              </form.Field>
              <span className='pb-2 text-sm text-muted-foreground'>to</span>
              <form.Field name='closesAt'>
                {(field) => (
                  <FormField>
                    <FormLabel>Closes</FormLabel>
                    <FormControl>
                      <Input
                        type='time'
                        step={60}
                        value={field.state.value}
                        disabled={values.isClosed || mutation.isPending}
                        onChange={(event) => {
                          setValidationError(undefined);
                          field.handleChange(event.target.value);
                        }}
                      />
                    </FormControl>
                  </FormField>
                )}
              </form.Field>
            </div>
            {!values.isClosed && isOvernightRange(values.opensAt, values.closesAt) && (
              <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <MoonStarIcon className='size-3.5' aria-hidden /> Overnight · closes the next day
              </p>
            )}
            {validationError && !values.isClosed && (
              <p role='alert' className='text-sm text-destructive'>
                {validationError}
              </p>
            )}
            {mutation.isError && (
              <p role='alert' className='text-sm text-destructive'>
                {updateErrorMessage(mutation.error)}
              </p>
            )}
          </div>
        )}
      </form.Subscribe>

      <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
        {([values, isSubmitting]) => {
          const original = businessHourToFormValues(hour);
          const isDirty =
            values.isClosed !== original.isClosed ||
            (!values.isClosed && (values.opensAt !== original.opensAt || values.closesAt !== original.closesAt));
          return (
            <Button type='submit' className='sm:mt-6' disabled={!isDirty || isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending ? (
                <>
                  <Loader2Icon className='animate-spin' aria-hidden /> Saving…
                </>
              ) : (
                'Save day'
              )}
            </Button>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

function BusinessHoursPanel({ placeId, timezone, canEdit }: { placeId: string; timezone: string; canEdit: boolean }) {
  const query = useQuery(businessHoursQueryOptions(placeId));
  const errorPresentation = getDashboardErrorPresentation(query.error);

  return (
    <SectionCard
      title='Weekly schedule'
      description='Each day saves independently. A closing time earlier than opening time means the place closes the next day.'
      action={
        <Badge variant='outline' className='max-w-full gap-1.5 text-sm'>
          <Clock3Icon aria-hidden /> <span className='truncate'>{timezone}</span>
        </Badge>
      }
      contentClassName='p-0'
    >
      {!canEdit && (
        <div className='flex items-center gap-2 border-b bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:px-5'>
          <LockIcon className='size-4' aria-hidden /> You have read-only access to this schedule.
        </div>
      )}
      {query.isPending ? (
        <div role='status' aria-label='Loading business hours' className='space-y-3 p-5'>
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className='h-14 w-full' />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          compact
          className='m-5'
          title={errorPresentation.title}
          description={errorPresentation.description}
          tone={getDashboardErrorTone(errorPresentation.kind)}
          onRetry={errorPresentation.canRetry ? () => void query.refetch() : undefined}
          isRetrying={query.isFetching}
        />
      ) : (
        <div className='divide-y'>
          {query.data.map((hour) => (
            <BusinessHourRow
              key={`${hour.day}:${hour.isClosed}:${hour.opensAt}:${hour.closesAt}`}
              placeId={placeId}
              hour={hour}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function BusinessHoursPage({ placeId }: { placeId: string }) {
  const ability = useAppAbility();
  const placeQuery = useQuery(managementPlaceQueryOptions(placeId));

  if (placeQuery.isPending) {
    return <Skeleton className='h-96 w-full' role='status' aria-label='Loading place' />;
  }
  if (placeQuery.isError || !placeQuery.data) {
    return <ErrorState title='Could not load place' onRetry={() => void placeQuery.refetch()} />;
  }

  const place = placeQuery.data;
  const canEdit = canAtPlace(ability, placeId, PERMISSION.PLACE_UPDATE);
  return (
    <>
      <PageHeader
        title='Business hours'
        description={`Manage when ${place.name} is open. All times use the place timezone.`}
        leading={
          <span className='flex size-11 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <Clock3Icon aria-hidden />
          </span>
        }
      />
      <BusinessHoursPanel placeId={placeId} timezone={place.timezone} canEdit={canEdit} />
    </>
  );
}

export { BusinessHourRow, BusinessHoursPage, BusinessHoursPanel, ReadOnlyHour };
