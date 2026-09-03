import { Link, useRouter } from '@tanstack/react-router';
import { AlertCircle, Home, MoveLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();
  const handleGoBack = () => {
    router.history.back();
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center'>
      <div className='absolute inset-0 -z-10 flex items-center justify-center blur-[100px] opacity-20 pointer-events-none'>
        <div className='aspect-square w-125 rounded-full bg-primary' />
      </div>

      <div className='max-w-md w-full space-y-6'>
        <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground animate-bounce'>
          <AlertCircle className='h-10 w-10 text-destructive' />
        </div>

        <div className='space-y-2'>
          <h1 className='text-8xl font-extrabold tracking-tighter text-foreground drop-shadow-sm'>404</h1>
          <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>Page Not Found</h2>
          <p className='text-sm text-muted-foreground'>
            Sorry, we couldn't find the page you are looking for. Perhaps the link is broken or the page has been
            removed.
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 justify-center items-center pt-4'>
          <Button variant='outline' onClick={handleGoBack} className='w-full sm:w-auto gap-2'>
            <MoveLeft className='h-4 w-4' />
            Kembali
          </Button>

          <Button className='w-full sm:w-auto gap-2' asChild>
            <Link to='/'>
              <Home className='h-4 w-4' />
              Ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
