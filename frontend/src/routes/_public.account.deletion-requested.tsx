import { createFileRoute } from '@tanstack/react-router';

import { AccountDeletionRequestedPage } from '@/features/users/components/account-deletion-requested-page';

export const Route = createFileRoute('/_public/account/deletion-requested')({
  head: () => ({ meta: [{ title: 'Account Deletion Requested | Tooang' }] }),
  component: AccountDeletionRequestedPage,
});
