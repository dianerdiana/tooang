import { createFileRoute } from '@tanstack/react-router';
import { LayoutDashboardIcon } from 'lucide-react';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';

export const Route = createFileRoute('/dashboard/')({
  head: () => ({ meta: [{ title: 'Management Dashboard | Tooang' }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <>
      <PageHeader
        title='Management dashboard'
        description='Manage the Tooang places and operations available to your account.'
      />
      <SectionCard
        title='Dashboard workspace'
        description='Your available management tools will appear here as they are added.'
      >
        <div className='flex items-start gap-4 rounded-lg bg-muted/60 p-4 text-sm sm:p-5'>
          <span className='flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <LayoutDashboardIcon aria-hidden='true' className='size-5' />
          </span>
          <div className='space-y-1'>
            <p className='font-semibold text-foreground'>The dashboard shell is ready.</p>
            <p className='max-w-2xl text-muted-foreground'>
              Navigation will expand according to your effective permissions as management features become available.
            </p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
