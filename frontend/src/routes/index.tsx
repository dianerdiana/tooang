import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { LogOutIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useLogoutMutation } from '@/features/auth/queries/auth.mutations';

import { useAuth } from '@/utils/hooks/use-auth';

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: '/' } });
    }
  },
  head: () => ({ meta: [{ title: 'Tooang' }] }),
  component: HomeRoute,
});

function HomeRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const logoutMutation = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      toast.error('You were signed out locally, but Tooang could not reach the server.');
    } finally {
      await router.navigate({ to: '/login', replace: true });
    }
  };

  return (
    <main className='flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground'>
      <Card className='w-full max-w-xl'>
        <CardHeader>
          <img src='/assets/logo/logo-brand-name.png' alt='Tooang' className='mb-4 h-9 w-fit object-contain' />
          <CardTitle className='text-xl'>Welcome, {user?.fullName}</CardTitle>
          <CardDescription>You are signed in to your Tooang account.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-5'>
          <dl className='grid gap-3 rounded-lg bg-muted/60 p-4 text-sm sm:grid-cols-2'>
            <div>
              <dt className='text-muted-foreground'>Email</dt>
              <dd className='mt-1 font-medium'>{user?.email}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Platform role</dt>
              <dd className='mt-1 font-medium'>{user?.platformRole}</dd>
            </div>
          </dl>
          <Button
            type='button'
            variant='outline'
            className='justify-self-start'
            disabled={logoutMutation.isPending}
            onClick={() => void handleLogout()}
          >
            <LogOutIcon /> {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
