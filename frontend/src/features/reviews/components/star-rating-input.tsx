import { StarIcon } from 'lucide-react';

import { LiveRegion } from '@/components/ui/live-region';

import { cn } from '@/utils/utils';

type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  invalid?: boolean;
  name?: string;
  className?: string;
};

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  invalid = false,
  name = 'rating',
  className,
}: StarRatingInputProps) {
  return (
    <div className={className}>
      <div role='radiogroup' aria-label='Rating' aria-invalid={invalid || undefined} className='flex w-fit gap-1'>
        {[1, 2, 3, 4, 5].map((rating) => (
          <label
            key={rating}
            className={cn(
              'relative inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-warning',
              'has-focus-visible:outline-none has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              className='sr-only'
              type='radio'
              name={name}
              value={rating}
              checked={value === rating}
              disabled={disabled}
              aria-label={`${rating} out of 5 stars`}
              onChange={() => onChange(rating)}
            />
            <StarIcon className={cn('size-7', value >= rating && 'fill-warning text-warning')} aria-hidden />
          </label>
        ))}
      </div>
      <LiveRegion>{value > 0 ? `${value} out of 5 stars selected.` : ''}</LiveRegion>
    </div>
  );
}

export function StarRatingDisplay({ rating }: { rating: number }) {
  return (
    <span className='inline-flex items-center gap-1 text-warning' aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon key={index} className={cn('size-4', index < rating && 'fill-warning')} aria-hidden />
      ))}
    </span>
  );
}
