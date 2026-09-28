import { LoaderCircleIcon, MinusIcon, PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/utils/utils';

type QuantityControlProps = {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

function QuantityControl({
  value,
  onValueChange,
  min = 1,
  max = 99,
  label = 'Quantity',
  disabled = false,
  loading = false,
  className,
}: QuantityControlProps) {
  const decreaseDisabled = disabled || loading || value <= min;
  const increaseDisabled = disabled || loading || value >= max;

  return (
    <div
      className={cn('inline-flex items-center rounded-lg border bg-surface shadow-xs', className)}
      role='group'
      aria-label={label}
    >
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='rounded-r-none'
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={decreaseDisabled}
        onClick={() => onValueChange(Math.max(min, value - 1))}
      >
        <MinusIcon aria-hidden />
      </Button>
      <output className='min-w-11 px-2 text-center font-semibold tabular-nums' aria-live='polite' aria-atomic='true'>
        <span className='sr-only'>{label}: </span>
        {loading ? (
          <LoaderCircleIcon className='mx-auto size-4 animate-spin motion-reduce:animate-none' aria-label='Updating' />
        ) : (
          value
        )}
      </output>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='rounded-l-none'
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={increaseDisabled}
        onClick={() => onValueChange(Math.min(max, value + 1))}
      >
        <PlusIcon aria-hidden />
      </Button>
    </div>
  );
}

export { QuantityControl, type QuantityControlProps };
