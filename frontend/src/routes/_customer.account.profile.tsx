import { createFileRoute } from '@tanstack/react-router';

import {
  ProtectedActionRecoveryNotice,
  useProtectedActionRecovery,
} from '@/features/auth/components/protected-action-recovery';
import { CustomerProfilePage } from '@/features/users/components/customer-profile-page';

export const Route = createFileRoute('/_customer/account/profile')({
  head: () => ({ meta: [{ title: 'Profile | Tooang' }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  const recovery = useProtectedActionRecovery({ currentUrl: '/account/profile' });

  return <CustomerProfilePage recoveryNotice={<ProtectedActionRecoveryNotice result={recovery} />} />;
}
