import { cn } from '@/utils/utils';

const wordmarkSizes = {
  header: 'text-xl',
  auth: 'text-3xl',
} as const;

type TooangWordmarkProps = {
  size?: keyof typeof wordmarkSizes;
  className?: string;
};

function TooangWordmark({ size = 'header', className }: TooangWordmarkProps) {
  return (
    <span
      data-slot='tooang-wordmark'
      className={cn('inline-flex font-[750] tracking-tight text-primary', wordmarkSizes[size], className)}
    >
      Tooang
    </span>
  );
}

export { TooangWordmark, type TooangWordmarkProps };
