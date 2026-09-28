import { createFileRoute } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import {
  ProtectedActionRecoveryNotice,
  useProtectedActionRecovery,
} from '@/features/auth/components/protected-action-recovery';

export const Route = createFileRoute('/_customer/account/profile')({
  head: () => ({ meta: [{ title: 'Profile | Tooang' }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  const recovery = useProtectedActionRecovery({ currentUrl: '/account/profile' });

  return (
    <RoutePlaceholder eyebrow='Account' title='Your profile' description='Customer profile controls will render here.'>
      <ProtectedActionRecoveryNotice result={recovery} />
    </RoutePlaceholder>
  );
}
