import { useState } from 'react';

import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router';
import { CompassIcon } from 'lucide-react';

import { CustomerShell } from '@/components/layouts/customer-shell';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

function CustomerRouteError({ reset }: ErrorComponentProps) {
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
    <CustomerShell>
      <div className='mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-page py-10'>
        <ErrorState
          className='w-full'
          title='This customer view stopped working'
          description='Your session is still available. Retry the view or return to discovery.'
          onRetry={() => void retry()}
          isRetrying={isRetrying}
          secondaryAction={
            <Button variant='outline' asChild>
              <Link to='/'>
                <CompassIcon aria-hidden />
                Discover
              </Link>
            </Button>
          }
        />
      </div>
    </CustomerShell>
  );
}

export { CustomerRouteError };
