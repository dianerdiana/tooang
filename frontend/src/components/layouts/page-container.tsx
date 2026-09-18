import * as React from 'react';

import { cn } from '@/utils/utils';

type PageContainerProps = React.ComponentProps<'main'> & {
  maxWidth?: 'none' | 'lg' | 'xl' | '2xl';
};

const maxWidthClasses: Record<NonNullable<PageContainerProps['maxWidth']>, string> = {
  none: 'max-w-none',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-screen-2xl',
};

function PageContainer({ className, maxWidth = '2xl', ...props }: PageContainerProps) {
  return (
    <main
      data-slot='page-container'
      className={cn(
        'mx-auto flex w-full flex-col gap-section px-page py-6 sm:py-8',
        maxWidthClasses[maxWidth],
        className,
      )}
      {...props}
    />
  );
}

export { PageContainer, type PageContainerProps };
