import { createFileRoute } from '@tanstack/react-router';

import { PublicShell } from '@/components/layouts/public-shell';

export const Route = createFileRoute('/_public')({
  component: PublicShell,
});
