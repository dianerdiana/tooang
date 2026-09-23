import { useState } from 'react';

import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

export default function ApplicationError({ reset }: ErrorComponentProps) {
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
    <main className='flex min-h-screen items-center justify-center bg-background px-4'>
      <ErrorState
        className='w-full max-w-xl'
        title='Tooang encountered an unexpected error'
        description='Your request could not be displayed. Try again or return to the home page.'
        onRetry={() => void retry()}
        isRetrying={isRetrying}
        secondaryAction={
          <Button size='sm' asChild>
            <Link to='/'>
              <Home aria-hidden />
              Home
            </Link>
          </Button>
        }
      />
    </main>
  );
}
