import { createFileRoute, notFound } from '@tanstack/react-router';

import { PublicPlaceDetailPage } from '@/features/places/components/public-place-detail-page';
import { normalizePublicDiscoverySearch, parsePublicPlacesSearch } from '@/features/places/schemas/places.schema';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_public/places/$slug')({
  validateSearch: parsePublicPlacesSearch,
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Place | Tooang' }] }),
  component: PlaceDetailRoute,
});

function PlaceDetailRoute() {
  const { slug } = Route.useParams();
  const discoverySearch = normalizePublicDiscoverySearch(Route.useSearch());
  return <PublicPlaceDetailPage slug={slug} discoverySearch={discoverySearch} />;
}
