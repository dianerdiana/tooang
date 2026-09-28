import { createFileRoute, notFound } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_public/places/$slug')({
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Place | Tooang' }] }),
  component: PlaceDetailRoute,
});

function PlaceDetailRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Place'
      title='Place details are coming next'
      description='This public route is ready for the published place experience without requiring a session.'
    />
  );
}
