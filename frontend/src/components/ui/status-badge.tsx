import * as React from 'react';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/utils/utils';

type StatusBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive';

type StatusBadgeProps = Omit<React.ComponentProps<typeof Badge>, 'variant'> & {
  tone?: StatusBadgeTone;
  showDot?: boolean;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/20 bg-primary-subtle text-foreground',
  success: 'border-success/25 bg-success/15 text-success dark:text-success',
  warning: 'border-warning/30 bg-warning/20 text-warning-foreground',
  destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
};

const dotClasses: Record<StatusBadgeTone, string> = {
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

function StatusBadge({ className, tone = 'neutral', showDot = false, children, ...props }: StatusBadgeProps) {
  return (
    <Badge variant='outline' data-slot='status-badge' className={cn(toneClasses[tone], className)} {...props}>
      {showDot && <span className={cn('size-1.5 rounded-full', dotClasses[tone])} aria-hidden />}
      {children}
    </Badge>
  );
}

export { StatusBadge, type StatusBadgeProps, type StatusBadgeTone };
