import * as React from 'react';

import { cn } from '@/utils/utils';

type StickyMobileActionBarProps = React.ComponentProps<'aside'> & {
  reserveSpace?: boolean;
  reserveClassName?: string;
};

function StickyMobileActionBar({
  children,
  className,
  reserveSpace = true,
  reserveClassName,
  'aria-label': ariaLabel = 'Page actions',
  ...props
}: StickyMobileActionBarProps) {
  return (
    <>
      {reserveSpace && (
        <div aria-hidden className={cn('h-[calc(5.5rem+var(--safe-area-bottom))] md:hidden', reserveClassName)} />
      )}
      <aside
        data-slot='sticky-mobile-action-bar'
        aria-label={ariaLabel}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 px-page pt-3 pb-[max(0.75rem,var(--safe-area-bottom))] shadow-overlay backdrop-blur-sm md:sticky md:px-0 md:pb-3',
          className,
        )}
        {...props}
      >
        <div className='mx-auto flex w-full max-w-5xl items-center gap-3'>{children}</div>
      </aside>
    </>
  );
}

export { StickyMobileActionBar, type StickyMobileActionBarProps };
