import { createFileRoute } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import {
  ProtectedActionRecoveryNotice,
  useProtectedActionRecovery,
} from '@/features/auth/components/protected-action-recovery';

export const Route = createFileRoute('/_customer/orders')({
  head: () => ({ meta: [{ title: 'Your orders | Tooang' }] }),
  component: OrdersRoute,
});

function OrdersRoute() {
  const recovery = useProtectedActionRecovery({ currentUrl: '/orders' });

  return (
    <RoutePlaceholder eyebrow='Orders' title='Your orders' description='Authenticated order history will render here.'>
      <ProtectedActionRecoveryNotice result={recovery} />
    </RoutePlaceholder>
  );
}
