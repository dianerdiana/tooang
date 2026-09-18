import * as React from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { cn } from '@/utils/utils';

type SectionCardProps = Omit<React.ComponentProps<typeof Card>, 'title'> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
};

function SectionCard({
  className,
  title,
  description,
  action,
  footer,
  contentClassName,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = title || description || action;

  return (
    <Card data-slot='section-card' className={className} {...props}>
      {hasHeader && (
        <CardHeader className='flex-row items-start justify-between gap-4'>
          <div className='min-w-0 space-y-1.5'>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn(!hasHeader && 'pt-card', contentClassName)}>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

export { SectionCard, type SectionCardProps };
