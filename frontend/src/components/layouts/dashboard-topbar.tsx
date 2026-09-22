import type { ReactNode } from 'react';

import { Link } from '@tanstack/react-router';
import { MenuIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SheetTrigger } from '@/components/ui/sheet';

import { NavUser } from './nav-user';

type DashboardTopbarProps = {
  context?: ReactNode;
};

function DashboardTopbar({ context }: DashboardTopbarProps) {
  return (
    <header className='sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-surface/95 px-page text-surface-foreground backdrop-blur supports-[backdrop-filter]:bg-surface/85'>
      <SheetTrigger asChild>
        <Button type='button' variant='ghost' size='icon' className='size-11 lg:hidden' aria-label='Open navigation'>
          <MenuIcon className='size-5' />
        </Button>
      </SheetTrigger>
      <div className='min-w-0 flex-1'>
        {context ?? (
          <Link
            to='/dashboard'
            className='rounded-sm text-lg font-extrabold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden'
          >
            Tooang
          </Link>
        )}
      </div>
      <NavUser />
    </header>
  );
}

export { DashboardTopbar, type DashboardTopbarProps };
