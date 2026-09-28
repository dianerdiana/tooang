import { createFileRoute } from '@tanstack/react-router';

import { PublicLandingPlaceholder } from '@/components/pages/public-landing-placeholder';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Tooang' }] }),
  component: PublicLandingPlaceholder,
});
