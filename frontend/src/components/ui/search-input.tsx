import * as React from 'react';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useDebounce } from '@/utils/hooks/use-debounce';
import { cn } from '@/utils/utils';

type SearchInputProps = Omit<React.ComponentProps<typeof Input>, 'onChange' | 'type' | 'value'> & {
  value: string;
  onValueChange: (value: string) => void;
  onDebouncedValueChange?: (value: string) => void;
  debounceMs?: number;
  clearLabel?: string;
};

function SearchInput({
  className,
  value,
  onValueChange,
  onDebouncedValueChange,
  debounceMs = 300,
  placeholder = 'Search…',
  'aria-label': ariaLabel = 'Search',
  clearLabel = 'Clear search',
  disabled,
  ...props
}: SearchInputProps) {
  const debouncedValue = useDebounce(value, debounceMs);

  React.useEffect(() => {
    onDebouncedValueChange?.(debouncedValue);
  }, [debouncedValue, onDebouncedValueChange]);

  return (
    <div data-slot='search-input' className={cn('relative w-full', className)}>
      <Search
        className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground'
        aria-hidden
      />
      <Input
        type='search'
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        className='pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none'
        {...props}
      />
      {value && !disabled ? (
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          className='absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground'
          aria-label={clearLabel}
          onClick={() => onValueChange('')}
        >
          <X aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

export { SearchInput, type SearchInputProps };
