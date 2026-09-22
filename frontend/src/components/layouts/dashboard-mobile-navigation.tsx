import { Link } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { DashboardNavigation, type DashboardNavigationGroup } from './dashboard-navigation';

type DashboardMobileNavigationProps = {
  navigation: readonly DashboardNavigationGroup[];
  onNavigate: () => void;
};

function DashboardMobileNavigation({ navigation, onNavigate }: DashboardMobileNavigationProps) {
  return (
    <SheetContent
      side='left'
      className='w-[min(20rem,calc(100vw-2rem))] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground lg:hidden'
      showCloseButton={false}
    >
      <SheetHeader className='h-16 justify-center border-b border-sidebar-border px-6 py-0 text-left'>
        <SheetTitle asChild>
          <Link
            to='/dashboard'
            className='w-fit rounded-sm text-xl font-extrabold tracking-tight text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'
            onClick={onNavigate}
          >
            Tooang
          </Link>
        </SheetTitle>
        <SheetDescription className='sr-only'>Management dashboard navigation</SheetDescription>
        <SheetClose asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute top-2.5 right-2.5 size-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring'
            aria-label='Close navigation'
          >
            <XIcon className='size-5' />
          </Button>
        </SheetClose>
      </SheetHeader>
      <div className='min-h-0 flex-1 overflow-y-auto px-3 py-6'>
        <DashboardNavigation groups={navigation} onNavigate={onNavigate} />
      </div>
    </SheetContent>
  );
}

export { DashboardMobileNavigation, type DashboardMobileNavigationProps };
