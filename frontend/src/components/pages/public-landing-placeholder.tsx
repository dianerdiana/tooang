import { TooangWordmark } from '@/components/branding/tooang-wordmark';

function PublicLandingPlaceholder() {
  return (
    <main className='min-h-screen bg-background px-page py-10 text-foreground sm:py-14 lg:py-20'>
      <div className='mx-auto w-full max-w-6xl'>
        <TooangWordmark size='auth' />
        <section className='mt-14 max-w-2xl sm:mt-20 lg:mt-24' aria-labelledby='discovery-heading'>
          <p className='text-sm font-semibold tracking-wide text-primary'>Local food, easier to explore</p>
          <h1 id='discovery-heading' className='mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>
            Discover places and browse their menus.
          </h1>
          <p className='mt-5 max-w-xl text-base text-muted-foreground sm:text-lg'>
            Public place discovery is being prepared. Soon, you will be able to browse published places and their menus
            here.
          </p>
        </section>
      </div>
    </main>
  );
}

export { PublicLandingPlaceholder };
