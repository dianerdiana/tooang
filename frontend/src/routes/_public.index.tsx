import { createFileRoute } from '@tanstack/react-router';

import { PublicPlaceDiscoveryPage } from '@/features/places/components/public-place-discovery-page';
import { normalizePublicDiscoverySearch, parsePublicPlacesSearch } from '@/features/places/schemas/places.schema';

export const Route = createFileRoute('/_public/')({
  validateSearch: parsePublicPlacesSearch,
  head: () => ({ meta: [{ title: 'Discover Places | Tooang' }] }),
  component: PublicPlaceDiscoveryRoute,
});

function PublicPlaceDiscoveryRoute() {
  const filters = normalizePublicDiscoverySearch(Route.useSearch());
  const navigate = Route.useNavigate();

  return (
    <PublicPlaceDiscoveryPage
      key={`${filters.search ?? ''}:${filters.city ?? ''}`}
      filters={filters}
      onFiltersChange={(nextFilters, options) => void navigate({ search: nextFilters, replace: options?.replace })}
    />
  );
}
