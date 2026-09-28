import * as React from 'react';

import { AlertCircleIcon, CheckCircle2Icon, CircleAlertIcon, InfoIcon, type LucideIcon } from 'lucide-react';

import { cn } from '@/utils/utils';

const alertPresentation = {
  info: { icon: InfoIcon, className: 'border-info/30 bg-info-subtle text-info-foreground' },
  success: { icon: CheckCircle2Icon, className: 'border-success/30 bg-success/10 text-foreground' },
  warning: { icon: CircleAlertIcon, className: 'border-warning/35 bg-warning/15 text-foreground' },
  error: { icon: AlertCircleIcon, className: 'border-destructive/30 bg-destructive/10 text-foreground' },
} satisfies Record<string, { icon: LucideIcon; className: string }>;

type CustomerAlertProps = React.ComponentProps<'div'> & {
  tone?: keyof typeof alertPresentation;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  live?: boolean;
};

function CustomerAlert({
  tone = 'info',
  title,
  description,
  action,
  live = false,
  className,
  ...props
}: CustomerAlertProps) {
  const presentation = alertPresentation[tone];
  const Icon = presentation.icon;

  return (
    <div
      data-slot='customer-alert'
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={live ? (tone === 'error' ? 'assertive' : 'polite') : undefined}
      aria-atomic={live || undefined}
      className={cn('grid grid-cols-[auto_1fr] gap-3 rounded-lg border p-4 text-sm', presentation.className, className)}
      {...props}
    >
      <Icon className='mt-0.5 size-5 shrink-0' aria-hidden />
      <div className='min-w-0'>
        <p className='font-semibold'>{title}</p>
        {description && <div className='mt-1 text-current/80'>{description}</div>}
        {action && <div className='mt-3'>{action}</div>}
      </div>
    </div>
  );
}

export { CustomerAlert, type CustomerAlertProps };
