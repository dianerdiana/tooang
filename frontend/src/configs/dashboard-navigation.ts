import {
  Building2Icon,
  Clock3Icon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SoupIcon,
  StarIcon,
  Table2Icon,
  UsersIcon,
} from 'lucide-react';

import type { DashboardNavigationGroup, DashboardNavigationItem } from '@/components/layouts/dashboard-navigation';

import { hasAnyPermission } from '@/utils/auth/dashboard-route-access';

import { PERMISSION, type PermissionIdentifier } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

export const dashboardRoutePermissions = {
  place: {
    orders: [PERMISSION.ORDER_READ],
    menu: [PERMISSION.MENU_CREATE, PERMISSION.MENU_UPDATE, PERMISSION.MENU_DELETE],
    diningTables: [PERMISSION.TABLE_READ, PERMISSION.TABLE_CREATE, PERMISSION.TABLE_UPDATE, PERMISSION.TABLE_DELETE],
    businessHours: [PERMISSION.PLACE_READ, PERMISSION.PLACE_UPDATE],
    members: [
      PERMISSION.PLACE_MEMBER_READ,
      PERMISSION.CASHIER_ASSIGN,
      PERMISSION.CASHIER_REVOKE,
      PERMISSION.OWNER_ASSIGN,
      PERMISSION.OWNER_REVOKE,
    ],
    settings: [
      PERMISSION.PLACE_UPDATE,
      PERMISSION.PLACE_PUBLISH,
      PERMISSION.PLACE_DELETE,
      PERMISSION.MEDIA_UPLOAD,
      PERMISSION.MEDIA_DELETE,
    ],
  },
  platform: {
    places: [
      PERMISSION.PLACE_READ,
      PERMISSION.PLACE_CREATE,
      PERMISSION.PLACE_UPDATE,
      PERMISSION.PLACE_PUBLISH,
      PERMISSION.PLACE_DELETE,
    ],
    orders: [PERMISSION.ORDER_READ],
    reviews: [PERMISSION.REVIEW_MODERATE],
    users: [PERMISSION.USER_READ],
  },
} as const satisfies Record<string, Record<string, readonly PermissionIdentifier[]>>;

type NavigationDefinition = DashboardNavigationItem & {
  permissions?: readonly PermissionIdentifier[];
};

type NavigationGroupDefinition = {
  id: string;
  label: string;
  scope: 'general' | 'place' | 'platform';
  items: readonly NavigationDefinition[];
};

const dashboardNavigationDefinitions: readonly NavigationGroupDefinition[] = [
  {
    id: 'general',
    label: 'General',
    scope: 'general',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        to: '/dashboard',
        icon: LayoutDashboardIcon,
        exact: true,
      },
    ],
  },
  {
    id: 'place',
    label: 'Place',
    scope: 'place',
    items: [
      {
        id: 'place-orders',
        label: 'Orders',
        to: '/dashboard/orders',
        icon: ListOrderedIcon,
        permissions: dashboardRoutePermissions.place.orders,
      },
      {
        id: 'place-menu',
        label: 'Menu',
        to: '/dashboard/menu',
        icon: SoupIcon,
        permissions: dashboardRoutePermissions.place.menu,
      },
      {
        id: 'place-tables',
        label: 'Dining Tables',
        to: '/dashboard/dining-tables',
        icon: Table2Icon,
        permissions: dashboardRoutePermissions.place.diningTables,
      },
      {
        id: 'place-hours',
        label: 'Business Hours',
        to: '/dashboard/business-hours',
        icon: Clock3Icon,
        permissions: dashboardRoutePermissions.place.businessHours,
      },
      {
        id: 'place-members',
        label: 'Members',
        to: '/dashboard/members',
        icon: UsersIcon,
        permissions: dashboardRoutePermissions.place.members,
      },
      {
        id: 'place-settings',
        label: 'Settings',
        to: '/dashboard/settings',
        icon: SettingsIcon,
        permissions: dashboardRoutePermissions.place.settings,
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    scope: 'platform',
    items: [
      {
        id: 'platform-places',
        label: 'Places',
        to: '/dashboard/platform/places',
        icon: Building2Icon,
        permissions: dashboardRoutePermissions.platform.places,
      },
      {
        id: 'platform-orders',
        label: 'Orders',
        to: '/dashboard/platform/orders',
        icon: ShoppingBagIcon,
        permissions: dashboardRoutePermissions.platform.orders,
      },
      {
        id: 'platform-reviews',
        label: 'Reviews',
        to: '/dashboard/platform/reviews',
        icon: StarIcon,
        permissions: dashboardRoutePermissions.platform.reviews,
      },
      {
        id: 'platform-users',
        label: 'Users',
        to: '/dashboard/platform/users',
        icon: ShieldCheckIcon,
        permissions: dashboardRoutePermissions.platform.users,
      },
    ],
  },
];

type BuildDashboardNavigationInput = {
  user: AuthenticatedUser;
  selectedPlace: PlaceMembership | null;
};

export const buildDashboardNavigation = ({
  user,
  selectedPlace,
}: BuildDashboardNavigationInput): DashboardNavigationGroup[] => {
  const search = selectedPlace ? { placeId: selectedPlace.placeId } : {};

  return dashboardNavigationDefinitions.flatMap((group) => {
    const grantedPermissions =
      group.scope === 'place'
        ? selectedPlace?.effectivePermissions
        : group.scope === 'platform'
          ? user.globalPermissions
          : null;

    const items = group.items
      .filter(
        (item) => !item.permissions || (grantedPermissions && hasAnyPermission(grantedPermissions, item.permissions)),
      )
      .map((item) => ({
        id: item.id,
        label: item.label,
        to: item.to,
        icon: item.icon,
        exact: item.exact,
        search,
      }));

    return items.length ? [{ id: group.id, label: group.label, items }] : [];
  });
};

export { dashboardNavigationDefinitions };
