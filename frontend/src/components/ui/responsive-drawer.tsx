import * as React from 'react';

import {
  Sheet,
  SheetContent,
  type SheetContentProps,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { cn } from '@/utils/utils';

type ResponsiveDrawerProps = React.ComponentProps<typeof Sheet> & {
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  side?: SheetContentProps['side'];
  contentClassName?: string;
  bodyClassName?: string;
};

function ResponsiveDrawer({
  trigger,
  title,
  description,
  children,
  side = 'left',
  contentClassName,
  bodyClassName,
  ...props
}: ResponsiveDrawerProps) {
  return (
    <Sheet {...props}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side={side} className={contentClassName}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-card pb-card', bodyClassName)}>{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export { ResponsiveDrawer, type ResponsiveDrawerProps };
