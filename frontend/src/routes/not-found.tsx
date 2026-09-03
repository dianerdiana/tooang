import { createFileRoute } from '@tanstack/react-router';

import NotFound from '@/components/pages/not-found';

export const Route = createFileRoute('/not-found')({
  head: () => ({
    meta: [{ title: 'Page Not Found | Frontend' }],
  }),
  component: NotFound,
});
