import { useEffect, useRef, useState } from 'react';

import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import {
  ArrowLeftIcon,
  CompassIcon,
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  type LucideIcon,
  MonitorIcon,
  MoonIcon,
  ShoppingBagIcon,
  StarIcon,
  SunIcon,
  UserRoundIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { TooangWordmark } from '@/components/branding/tooang-wordmark';
import { ModeToggle } from '@/components/themes/mode-toggle';
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
import { LiveRegion } from '@/components/ui/live-region';

import { useLogoutMutation } from '@/features/auth/queries/auth.mutations';

import { canAccessDashboard } from '@/utils/auth/dashboard-access';
import type { Theme } from '@/utils/context/theme-context';
import { useAuth } from '@/utils/hooks/use-auth';
import { useTheme } from '@/utils/hooks/use-theme';
import { cn } from '@/utils/utils';

type ContextualCart = {
  slug: string;
  href: string;
  itemCount?: number;
};

const themeOptions: readonly { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
];

function getUserInitials(fullName?: string | null) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return (
    parts
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join('')
      .toLocaleUpperCase() || 'U'
  );
}

function isTheme(value: string): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getLogicalBackHref(pathname: string): string | null {
  const placeMatch = pathname.match(/^\/places\/([^/]+)(?:\/(menu|cart|checkout))?$/);
  if (placeMatch) {
    const [, slug, step] = placeMatch;
    if (step === 'checkout') return `/places/${slug}/cart`;
    if (step === 'cart') return `/places/${slug}/menu`;
    if (step === 'menu') return `/places/${slug}`;
    return '/';
  }
  if (/^\/orders\/[^/]+$/.test(pathname)) return '/orders';
  if (pathname === '/account/reviews') return '/account/profile';
  if (pathname.startsWith('/verify/')) return '/';
  return null;
}

function getContextualCart(pathname: string, itemCount?: number): ContextualCart | null {
  const match = pathname.match(/^\/places\/([^/]+)(?:\/menu)?$/);
  if (!match) return null;
  return { slug: match[1], href: `/places/${match[1]}/cart`, itemCount };
}

function getActiveCustomerDestination(pathname: string) {
  if (pathname === '/' || pathname.startsWith('/places/')) return 'discover' as const;
  if (pathname.startsWith('/orders')) return 'orders' as const;
  if (pathname.startsWith('/account')) return 'account' as const;
  return null;
}

function formatCartCount(count: number) {
  return count > 99 ? '99+' : String(count);
}

function CartCountBadge({ count }: { count: number }) {
  const previousCount = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (previousCount.current !== null && previousCount.current !== count) {
      setAnnouncement(`Cart updated: ${count} ${count === 1 ? 'item' : 'items'}`);
    }
    previousCount.current = count;
  }, [count]);

  if (count <= 0) return null;

  return (
    <>
      <span
        data-slot='cart-count-badge'
        aria-hidden='true'
        className='absolute -top-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold text-primary-foreground tabular-nums'
      >
        {formatCartCount(count)}
      </span>
      <LiveRegion>{announcement}</LiveRegion>
    </>
  );
}

function CustomerAccountMenu() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const logoutMutation = useLogoutMutation();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <Button variant='ghost' asChild>
        <Link to='/login' search={{ redirect: '/account/profile' }}>
          <LogInIcon aria-hidden />
          <span className='hidden sm:inline'>Sign in</span>
        </Link>
      </Button>
    );
  }

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await logoutMutation.mutateAsync();
    } catch {
      toast.error('You were signed out locally, but Tooang could not reach the server.');
    } finally {
      await router.navigate({ to: '/', replace: true });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' aria-label='Open account menu'>
          <span
            aria-hidden='true'
            className='flex size-8 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-foreground'
          >
            {getUserInitials(user.fullName)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuLabel className='space-y-0.5 font-normal'>
          <span className='block truncate font-semibold text-foreground'>{user.fullName}</span>
          <span className='block truncate text-xs text-muted-foreground'>{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className='min-h-11'>
            <Link to='/account/profile'>
              <UserRoundIcon /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className='min-h-11'>
            <Link to='/account/reviews'>
              <StarIcon /> Reviews
            </Link>
          </DropdownMenuItem>
          {canAccessDashboard(user) && (
            <DropdownMenuItem asChild className='min-h-11'>
              <Link to='/dashboard' search={{}}>
                <LayoutDashboardIcon /> Dashboard
              </Link>
            </DropdownMenuItem>
          )}
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
                      <Icon /> {option.label}
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

type CustomerNavigationProps = {
  cartItemCount?: number;
};

function CustomerNavigation({ cartItemCount }: CustomerNavigationProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const backHref = getLogicalBackHref(pathname);
  const cart = getContextualCart(pathname, cartItemCount);
  const activeDestination = getActiveCustomerDestination(pathname);

  return (
    <>
      <header className='sticky top-0 z-40 border-b bg-surface/95 backdrop-blur-sm'>
        <div className='mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-page'>
          {backHref ? (
            <Button
              variant='ghost'
              size='icon'
              aria-label='Go to previous step'
              onClick={() => void navigate({ href: backHref })}
            >
              <ArrowLeftIcon aria-hidden />
            </Button>
          ) : (
            <Link
              to='/'
              aria-label='Tooang home'
              className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <TooangWordmark />
            </Link>
          )}

          {backHref && (
            <Link
              to='/'
              aria-label='Tooang home'
              className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <TooangWordmark />
            </Link>
          )}

          <nav aria-label='Primary navigation' className='ml-auto hidden items-center gap-1 md:flex'>
            <Button variant='ghost' asChild>
              <Link to='/' aria-current={activeDestination === 'discover' ? 'page' : undefined}>
                Discover
              </Link>
            </Button>
            <Button variant='ghost' asChild>
              {isAuthenticated ? (
                <Link to='/orders' aria-current={activeDestination === 'orders' ? 'page' : undefined}>
                  Orders
                </Link>
              ) : (
                <Link
                  to='/login'
                  search={{ redirect: '/orders' }}
                  aria-current={activeDestination === 'orders' ? 'page' : undefined}
                >
                  Orders
                </Link>
              )}
            </Button>
            {cart && (
              <Button variant='ghost' asChild>
                <Link to='/places/$slug/cart' params={{ slug: cart.slug }} className='relative'>
                  <ShoppingBagIcon aria-hidden /> Cart
                  <CartCountBadge count={cart.itemCount ?? 0} />
                </Link>
              </Button>
            )}
            <ModeToggle />
            <CustomerAccountMenu />
          </nav>

          <div className='ml-auto flex items-center gap-1 md:hidden'>
            {cart && (
              <Button variant='ghost' size='icon' asChild>
                <Link to='/places/$slug/cart' params={{ slug: cart.slug }} className='relative' aria-label='Open cart'>
                  <ShoppingBagIcon aria-hidden />
                  <CartCountBadge count={cart.itemCount ?? 0} />
                </Link>
              </Button>
            )}
            <CustomerAccountMenu />
          </div>
        </div>
      </header>

      <nav
        aria-label='Customer navigation'
        className='fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t bg-surface/95 px-[max(0.5rem,var(--safe-area-left))] pt-1 pb-[max(0.25rem,var(--safe-area-bottom))] shadow-overlay backdrop-blur-sm md:hidden'
      >
        <MobileNavigationItem
          destination='discover'
          label='Discover'
          icon={CompassIcon}
          active={activeDestination === 'discover'}
          authenticated={isAuthenticated}
        />
        <MobileNavigationItem
          destination='orders'
          label='Orders'
          icon={ShoppingBagIcon}
          active={activeDestination === 'orders'}
          authenticated={isAuthenticated}
        />
        <MobileNavigationItem
          destination='account'
          label='Account'
          icon={UserRoundIcon}
          active={activeDestination === 'account'}
          authenticated={isAuthenticated}
        />
      </nav>
    </>
  );
}

type MobileNavigationItemProps = {
  destination: 'discover' | 'orders' | 'account';
  label: string;
  icon: LucideIcon;
  active: boolean;
  authenticated: boolean;
};

function MobileNavigationItem({ destination, label, icon: Icon, active, authenticated }: MobileNavigationItemProps) {
  const content = (
    <>
      <Icon className='size-5' aria-hidden />
      <span className='truncate'>{label}</span>
    </>
  );
  const className = cn(
    'flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );
  const current = active ? 'page' : undefined;

  if (destination === 'discover') {
    return (
      <Link to='/' aria-current={current} className={className}>
        {content}
      </Link>
    );
  }

  if (!authenticated) {
    return (
      <Link
        to='/login'
        search={{ redirect: destination === 'orders' ? '/orders' : '/account/profile' }}
        aria-current={current}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return destination === 'orders' ? (
    <Link to='/orders' aria-current={current} className={className}>
      {content}
    </Link>
  ) : (
    <Link to='/account/profile' aria-current={current} className={className}>
      {content}
    </Link>
  );
}

export {
  CartCountBadge,
  CustomerNavigation,
  type CustomerNavigationProps,
  formatCartCount,
  getActiveCustomerDestination,
  getContextualCart,
  getLogicalBackHref,
  getUserInitials,
};
