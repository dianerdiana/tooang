import { StarIcon } from 'lucide-react';

import { cn } from '@/utils/utils';

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

type RatingDisplayProps = {
  value: number;
  reviewCount?: number;
  className?: string;
  label?: string;
};

function RatingDisplay({ value, reviewCount, className, label = 'Rating' }: RatingDisplayProps) {
  const safeValue = Math.min(5, Math.max(0, value));
  const accessibleLabel = `${label}: ${safeValue.toFixed(1)} out of 5${reviewCount === undefined ? '' : `, ${reviewCount} reviews`}`;

  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)} aria-label={accessibleLabel}>
      <span className='flex text-warning' aria-hidden>
        {RATING_VALUES.map((rating) => (
          <StarIcon key={rating} className={cn('size-4', rating <= Math.round(safeValue) && 'fill-current')} />
        ))}
      </span>
      <span className='font-semibold tabular-nums'>{safeValue.toFixed(1)}</span>
      {reviewCount !== undefined && <span className='text-muted-foreground'>({reviewCount})</span>}
    </span>
  );
}

type RatingInputProps = {
  name: string;
  value: number | null;
  onValueChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
};

function RatingInput({
  name,
  value,
  onValueChange,
  label = 'Rating',
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
  className,
}: RatingInputProps) {
  return (
    <fieldset className={cn('min-w-0', className)} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className='mb-2 text-sm font-medium'>{label}</legend>
      <div className='flex' data-slot='rating-input'>
        {RATING_VALUES.map((rating) => (
          <label
            key={rating}
            className='relative inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-warning focus-within:ring-[3px] focus-within:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:text-disabled-foreground'
          >
            <input
              className='sr-only'
              type='radio'
              name={name}
              value={rating}
              checked={value === rating}
              disabled={disabled}
              required={required}
              aria-label={`${rating} out of 5 stars`}
              onChange={() => onValueChange(rating)}
            />
            <StarIcon className={cn('size-6', rating <= (value ?? 0) && 'fill-warning text-warning')} aria-hidden />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export { RatingDisplay, type RatingDisplayProps, RatingInput, type RatingInputProps };
