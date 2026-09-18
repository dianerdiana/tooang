import * as React from 'react';

import { RotateCcw, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { cn } from '@/utils/utils';

type FilterBarProps = React.ComponentProps<'div'> & {
  activeCount?: number;
  onReset?: () => void;
  resetLabel?: string;
};

function FilterBar({
  className,
  activeCount = 0,
  onReset,
  resetLabel = 'Reset filters',
  children,
  ...props
}: FilterBarProps) {
  return (
    <div
      data-slot='filter-bar'
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end',
        className,
      )}
      {...props}
    >
      <div className='flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end'>{children}</div>
      {onReset && (
        <Button type='button' variant='ghost' size='sm' onClick={onReset} disabled={activeCount === 0}>
          <RotateCcw aria-hidden />
          {resetLabel}
          {activeCount > 0 && (
            <span
              className='rounded-full bg-primary-subtle px-1.5 py-0.5 text-[0.6875rem] text-foreground'
              aria-label={`${activeCount} active filters`}
            >
              {activeCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}

type FilterOption<TValue extends string = string> = {
  value: TValue;
  label: React.ReactNode;
  disabled?: boolean;
};

type FilterSelectProps<TValue extends string = string> = {
  id?: string;
  label: React.ReactNode;
  value?: TValue;
  defaultValue?: TValue;
  onValueChange?: (value: TValue) => void;
  options: readonly FilterOption<TValue>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

function FilterSelect<TValue extends string = string>({
  id,
  label,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Select',
  disabled,
  className,
  triggerClassName,
}: FilterSelectProps<TValue>) {
  const generatedId = React.useId();
  const triggerId = id ?? generatedId;

  return (
    <div data-slot='filter-select' className={cn('grid min-w-40 gap-1.5', className)}>
      <Label htmlFor={triggerId} className='text-xs text-muted-foreground'>
        <SlidersHorizontal className='size-3.5' aria-hidden />
        {label}
      </Label>
      <Select
        value={value}
        defaultValue={defaultValue}
        onValueChange={(nextValue) => onValueChange?.(nextValue as TValue)}
        disabled={disabled}
      >
        <SelectTrigger id={triggerId} className={cn('w-full sm:w-auto', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { FilterBar, type FilterBarProps, type FilterOption, FilterSelect, type FilterSelectProps };
