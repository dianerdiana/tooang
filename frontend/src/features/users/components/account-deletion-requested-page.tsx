import { Link } from '@tanstack/react-router';
import { Clock3Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

export function AccountDeletionRequestedPage() {
  return (
    <div className='mx-auto flex min-h-[65vh] w-full max-w-2xl items-center px-page py-10'>
      <Card className='w-full text-center'>
        <CardHeader className='items-center'>
          <span className='flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning-foreground'>
            <Clock3Icon className='size-6' aria-hidden />
          </span>
          <p className='text-sm font-semibold text-primary'>Request accepted</p>
          <h1 className='text-2xl font-bold tracking-tight'>Account deletion is pending</h1>
          <CardDescription className='max-w-lg'>
            You have been signed out and protected access has stopped. The account has not been immediately erased;
            anonymization or removal will be completed under the retention process within 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex justify-center'>
          <Button asChild>
            <Link to='/'>Discover places</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
