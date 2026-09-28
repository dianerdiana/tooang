import * as React from 'react';

import { cn } from '@/utils/utils';

type LiveRegionProps = React.ComponentProps<'div'> & {
  politeness?: 'polite' | 'assertive';
  visuallyHidden?: boolean;
};

function LiveRegion({ politeness = 'polite', visuallyHidden = true, className, ...props }: LiveRegionProps) {
  return (
    <div
      data-slot='live-region'
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic='true'
      className={cn(visuallyHidden && 'sr-only', className)}
      {...props}
    />
  );
}

export { LiveRegion, type LiveRegionProps };
