import { createFileRoute } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

export const Route = createFileRoute('/_customer/account/profile')({
  head: () => ({ meta: [{ title: 'Profile | Tooang' }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Account'
      title='Your profile'
      description='Customer profile controls will render here.'
    />
  );
}
