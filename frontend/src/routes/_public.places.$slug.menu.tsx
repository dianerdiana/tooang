import { createFileRoute, notFound } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import { parsePublicPlacesSearch } from '@/features/places/schemas/places.schema';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_public/places/$slug/menu')({
  validateSearch: parsePublicPlacesSearch,
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Menu | Tooang' }] }),
  component: PublicMenuRoute,
});

function PublicMenuRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Menu'
      title='Public menu browsing is coming next'
      description='This route will compose the API-backed menu feature while keeping data access outside the route file.'
    />
  );
}
