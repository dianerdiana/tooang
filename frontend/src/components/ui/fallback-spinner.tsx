import { Loader2 } from 'lucide-react';

type FallbackSpinnerProps = {
  fullscreen?: boolean;
};

export function FallbackSpinner({ fullscreen = false }: FallbackSpinnerProps) {
  const wrapperClass = fullscreen
    ? 'flex min-h-screen items-center justify-center'
    : 'flex min-h-60 items-center justify-center';

  return (
    <div className={wrapperClass}>
      <Loader2 className='size-6 animate-spin text-primary' />
    </div>
  );
}
