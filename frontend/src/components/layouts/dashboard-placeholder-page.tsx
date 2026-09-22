import { ConstructionIcon } from 'lucide-react';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';

import type { DashboardSearch } from '@/utils/dashboard-place';

type DashboardPlaceholderPageProps = {
  title: string;
  description: string;
  search: DashboardSearch;
  scopeLabel?: string;
};

function DashboardPlaceholderPage({ title, description, search, scopeLabel }: DashboardPlaceholderPageProps) {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { id: 'dashboard', label: 'Dashboard', to: '/dashboard', search },
          ...(scopeLabel ? [{ id: 'scope', label: scopeLabel }] : []),
          { id: 'current', label: title },
        ]}
        title={title}
        description={description}
      />
      <SectionCard>
        <div className='flex items-start gap-4 rounded-lg bg-muted/60 p-4 text-sm sm:p-5'>
          <span className='flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary'>
            <ConstructionIcon aria-hidden='true' className='size-5' />
          </span>
          <div className='space-y-1'>
            <p className='font-semibold text-foreground'>This workspace is ready for its feature implementation.</p>
            <p className='max-w-2xl text-muted-foreground'>
              Navigation and route access are active. Feature data and actions will be added in the corresponding task.
            </p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

export { DashboardPlaceholderPage, type DashboardPlaceholderPageProps };
