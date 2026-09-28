import { createFileRoute } from '@tanstack/react-router';

import { CustomerRouteError } from '@/components/layouts/customer-route-error';
import { CustomerShell } from '@/components/layouts/customer-shell';

import { requireCustomerAuth } from '@/utils/auth/customer-access';

export const Route = createFileRoute('/_customer')({
  beforeLoad: ({ context, location }) => requireCustomerAuth(context, location.href),
  errorComponent: CustomerRouteError,
  component: CustomerShell,
});
