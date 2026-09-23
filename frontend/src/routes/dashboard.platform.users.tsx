import { createFileRoute } from '@tanstack/react-router';

import { UserManagementPage } from '@/features/users/components/user-management-page';
import { parseUsersSearch } from '@/features/users/schemas/users.schema';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

import { PERMISSION } from '@/types/permission.type';

export const Route = createFileRoute('/dashboard/platform/users')({
  validateSearch: parseUsersSearch,
  beforeLoad: ({ context }) => requirePlatformDashboardRoute(context.auth.user, [PERMISSION.USER_READ]),
  head: () => ({ meta: [{ title: 'Platform Users | Tooang' }] }),
  component: PlatformUsersRoute,
});

function PlatformUsersRoute() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <UserManagementPage
      key={filters.search ?? ''}
      filters={filters}
      onFiltersChange={(nextFilters) => void navigate({ search: nextFilters })}
    />
  );
}
