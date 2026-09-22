import { useState } from 'react';

import { Link, useRouter } from '@tanstack/react-router';
import { HomeIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useLogoutMutation } from '@/features/auth/queries/auth.mutations';

import type { Theme } from '@/utils/context/theme-context';
import { useAuth } from '@/utils/hooks/use-auth';
import { useTheme } from '@/utils/hooks/use-theme';

const themeOptions: readonly { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
];

function getUserInitials(fullName: string | null | undefined) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toLocaleUpperCase();

  return initials || 'U';
}

function isTheme(value: string): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function NavUser() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const logoutMutation = useLogoutMutation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    setIsOpen(false);

    try {
      await logoutMutation.mutateAsync();
    } catch {
      toast.error('You were signed out locally, but Tooang could not reach the server.');
    } finally {
      await router.navigate({ to: '/login', replace: true });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          className='h-11 max-w-64 justify-start gap-3 px-1.5 sm:px-2'
          aria-label='Open user menu'
        >
          <span
            aria-hidden='true'
            className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-foreground'
          >
            {getUserInitials(user?.fullName)}
          </span>
          <span className='hidden min-w-0 text-left sm:block'>
            <span className='block truncate text-sm font-semibold'>{user?.fullName ?? 'Tooang user'}</span>
            <span className='block truncate text-xs font-normal text-muted-foreground'>{user?.email}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuLabel className='space-y-0.5 font-normal'>
          <span className='block truncate font-semibold text-foreground'>{user?.fullName ?? 'Tooang user'}</span>
          <span className='block truncate text-xs text-muted-foreground'>{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className='min-h-11'>
            <Link to='/'>
              <HomeIcon /> Customer home
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className='min-h-11'>
              <SunIcon /> Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) => {
                  if (isTheme(value)) setTheme(value);
                }}
              >
                {themeOptions.map((option) => {
                  const Icon = option.icon;

                  return (
                    <DropdownMenuRadioItem key={option.value} value={option.value} className='min-h-11'>
                      <Icon />
                      {option.label}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className='min-h-11' disabled={logoutMutation.isPending} onSelect={() => void handleLogout()}>
          <LogOutIcon /> {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { getUserInitials, NavUser };
