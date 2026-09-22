import type { ComponentType, SVGProps } from 'react';

import { Link, type LinkProps } from '@tanstack/react-router';

import { cn } from '@/utils/utils';

type DashboardNavigationIcon = ComponentType<SVGProps<SVGSVGElement>>;

type DashboardNavigationItem = {
  id: string;
  label: string;
  to: LinkProps['to'];
  icon?: DashboardNavigationIcon;
  exact?: boolean;
};

type DashboardNavigationGroup = {
  id: string;
  label: string;
  items: readonly DashboardNavigationItem[];
};

type DashboardNavigationProps = {
  groups: readonly DashboardNavigationGroup[];
  onNavigate?: () => void;
  className?: string;
};

function DashboardNavigation({ className, groups, onNavigate }: DashboardNavigationProps) {
  return (
    <nav aria-label='Dashboard navigation' className={cn('space-y-6', className)}>
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`dashboard-nav-${group.id}`}>
          <h2
            id={`dashboard-nav-${group.id}`}
            className='mb-2 px-3 text-xs font-semibold tracking-[0.14em] text-sidebar-foreground/60 uppercase'
          >
            {group.label}
          </h2>
          <ul className='space-y-1'>
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.exact }}
                    activeProps={{
                      'aria-current': 'page',
                      className: 'bg-sidebar-primary text-sidebar-primary-foreground shadow-xs',
                    }}
                    inactiveProps={{
                      className:
                        'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    }}
                    className='flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'
                    onClick={onNavigate}
                  >
                    {Icon && <Icon aria-hidden='true' className='size-5 shrink-0' />}
                    <span className='truncate'>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

export {
  DashboardNavigation,
  type DashboardNavigationGroup,
  type DashboardNavigationIcon,
  type DashboardNavigationItem,
  type DashboardNavigationProps,
};
