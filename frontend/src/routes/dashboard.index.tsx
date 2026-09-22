import { createFileRoute, Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/dashboard/')({
  head: () => ({ meta: [{ title: 'Management Dashboard | Tooang' }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <main className='flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground'>
      <Card className='w-full max-w-xl'>
        <CardHeader>
          <CardTitle className='text-xl'>Management dashboard</CardTitle>
          <CardDescription>Your available management tools will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant='outline'>
            <Link to='/'>Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
