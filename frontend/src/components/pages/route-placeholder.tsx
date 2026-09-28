import { cn } from '@/utils/utils';

type RoutePlaceholderProps = {
  children?: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
};

function RoutePlaceholder({ children, eyebrow, title, description, className }: RoutePlaceholderProps) {
  return (
    <section className={cn('mx-auto w-full max-w-3xl px-page py-10 sm:py-14', className)}>
      <p className='text-sm font-semibold tracking-wide text-primary'>{eyebrow}</p>
      <h1 className='mt-2' tabIndex={-1}>
        {title}
      </h1>
      <p className='mt-3 max-w-2xl text-muted-foreground'>{description}</p>
      {children && <div className='mt-6'>{children}</div>}
    </section>
  );
}

export { RoutePlaceholder, type RoutePlaceholderProps };
