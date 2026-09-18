import * as React from 'react';

import { Slot } from 'radix-ui';

import { Label } from '@/components/ui/label';

import { cn } from '@/utils/utils';

type FormFieldContextValue = {
  controlId: string;
  descriptionId: string;
  messageId: string;
  invalid: boolean;
  error?: React.ReactNode;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function useFormFieldContext() {
  const context = React.useContext(FormFieldContext);

  if (!context) throw new Error('Form field components must be used inside <FormField>.');

  return context;
}

type FormFieldProps = React.ComponentProps<'div'> & {
  id?: string;
  error?: React.ReactNode;
};

function FormField({ id, error, className, ...props }: FormFieldProps) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const context = React.useMemo(
    () => ({
      controlId,
      descriptionId: `${controlId}-description`,
      messageId: `${controlId}-message`,
      invalid: Boolean(error),
      error,
    }),
    [controlId, error],
  );

  return (
    <FormFieldContext.Provider value={context}>
      <div data-slot='form-field' className={cn('group grid gap-2', className)} {...props} />
    </FormFieldContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { controlId, invalid } = useFormFieldContext();

  return (
    <Label
      data-slot='form-label'
      htmlFor={controlId}
      data-error={invalid || undefined}
      className={cn('data-[error=true]:text-destructive', className)}
      {...props}
    />
  );
}

function FormControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { controlId, descriptionId, messageId, invalid } = useFormFieldContext();

  return (
    <Slot.Root
      data-slot='form-control'
      id={controlId}
      aria-describedby={invalid ? `${descriptionId} ${messageId}` : descriptionId}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { descriptionId } = useFormFieldContext();

  return (
    <p
      data-slot='form-description'
      id={descriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function FormMessage({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { messageId, error } = useFormFieldContext();
  const content = children ?? error;

  if (!content) return null;

  return (
    <p
      data-slot='form-message'
      id={messageId}
      role='alert'
      className={cn('text-sm text-destructive', className)}
      {...props}
    >
      {content}
    </p>
  );
}

export { FormControl, FormDescription, FormField, type FormFieldProps, FormLabel, FormMessage };
