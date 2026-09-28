import { createFileRoute, notFound } from '@tanstack/react-router';

import { PublicMenuPage } from '@/features/menu-items/components/public-menu-page';
import { parsePublicMenuRouteSearch } from '@/features/menu-items/schemas/menu-items.schema';
import { normalizePublicDiscoverySearch } from '@/features/places/schemas/places.schema';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_public/places/$slug/menu')({
  validateSearch: parsePublicMenuRouteSearch,
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Menu | Tooang' }] }),
  component: PublicMenuRoute,
});

function PublicMenuRoute() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const discoverySearch = normalizePublicDiscoverySearch(search);
  return (
    <PublicMenuPage
      slug={slug}
      discoverySearch={discoverySearch}
      filters={{
        ...(search.menuType ? { type: search.menuType } : {}),
        ...(search.categoryId ? { categoryId: search.categoryId } : {}),
      }}
      onFiltersChange={(filters) =>
        void navigate({
          replace: true,
          search: (previous) => ({
            ...previous,
            menuType: filters.type,
            categoryId: filters.categoryId,
          }),
        })
      }
    />
  );
}
