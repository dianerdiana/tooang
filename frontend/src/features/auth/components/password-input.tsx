import * as React from 'react';

import { EyeIcon, EyeOffIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { cn } from '@/utils/utils';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, id, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const label = isVisible ? 'Hide password' : 'Show password';

    return (
      <div className='relative'>
        <Input
          {...props}
          ref={ref}
          id={id}
          type={isVisible ? 'text' : 'password'}
          disabled={disabled}
          className={cn('pr-14', className)}
        />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='absolute top-0 right-0 h-12 w-12 rounded-l-none text-muted-foreground hover:text-foreground'
          aria-label={label}
          aria-pressed={isVisible}
          aria-controls={id}
          disabled={disabled}
          onClick={() => setIsVisible((visible) => !visible)}
        >
          {isVisible ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </Button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
