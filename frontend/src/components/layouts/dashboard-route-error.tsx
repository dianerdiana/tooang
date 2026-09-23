import { useState } from 'react';

import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router';
import { LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

export function DashboardRouteError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = async () => {
    setIsRetrying(true);
    try {
      await router.invalidate();
      reset();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className='mx-auto flex min-h-[50vh] w-full max-w-3xl items-center px-4 py-10'>
      <ErrorState
        className='w-full'
        title='This dashboard view stopped working'
        description='An unexpected interface error occurred. Your session and the rest of the dashboard are still available.'
        onRetry={() => void retry()}
        isRetrying={isRetrying}
        secondaryAction={
          <Button size='sm' asChild>
            <Link to='/dashboard' search={{}}>
              <LayoutDashboard aria-hidden />
              Dashboard
            </Link>
          </Button>
        }
      />
    </div>
  );
}
