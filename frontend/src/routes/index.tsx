import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Tooang' }] }),
  component: FoundationRoute,
});

function FoundationRoute() {
  return (
    <main className='flex min-h-screen items-center justify-center bg-background px-6 text-foreground'>
      <div className='text-center'>
        <h1 className='text-3xl font-semibold tracking-tight'>Tooang</h1>
        <p className='mt-2 text-sm text-muted-foreground'>Frontend foundation is ready.</p>
      </div>
    </main>
  );
}
