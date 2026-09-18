import * as React from 'react';

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { cn } from '@/utils/utils';

type PaginationProps = React.ComponentProps<'nav'> & {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  siblingCount?: number;
  disabled?: boolean;
};

function getPageNumbers(page: number, totalPages: number, siblingCount: number) {
  const start = Math.max(1, page - siblingCount);
  const end = Math.min(totalPages, page + siblingCount);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function Pagination({
  className,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  siblingCount = 1,
  disabled = false,
  ...props
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const validPageSizes = [
    ...new Set([...pageSizeOptions, pageSize].filter((option) => option > 0 && option <= 100)),
  ].sort((a, b) => a - b);
  const firstItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastItem = Math.min(safePage * pageSize, totalItems);
  const pageNumbers = getPageNumbers(safePage, safeTotalPages, Math.max(0, siblingCount));

  const setPage = (nextPage: number) => onPageChange(Math.min(Math.max(1, nextPage), safeTotalPages));

  return (
    <nav
      data-slot='pagination'
      aria-label='Pagination'
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}
      {...props}
    >
      <p className='text-sm text-muted-foreground' aria-live='polite'>
        {totalItems === 0 ? 'No items' : `Showing ${firstItem}–${lastItem} of ${totalItems}`}
      </p>

      <div className='flex flex-wrap items-center gap-2'>
        {onPageSizeChange && validPageSizes.length > 0 && (
          <div className='mr-1 flex items-center gap-2'>
            <span className='hidden text-sm text-muted-foreground sm:inline'>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className='w-18' aria-label='Rows per page'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align='end'>
                {validPageSizes.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          type='button'
          variant='outline'
          size='icon-sm'
          aria-label='Go to first page'
          disabled={disabled || safePage <= 1}
          onClick={() => setPage(1)}
        >
          <ChevronFirst aria-hidden />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon-sm'
          aria-label='Go to previous page'
          disabled={disabled || safePage <= 1}
          onClick={() => setPage(safePage - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>

        <div className='hidden items-center gap-1 sm:flex'>
          {pageNumbers.map((pageNumber) => (
            <Button
              key={pageNumber}
              type='button'
              variant={pageNumber === safePage ? 'default' : 'outline'}
              size='icon-sm'
              aria-label={`Go to page ${pageNumber}`}
              aria-current={pageNumber === safePage ? 'page' : undefined}
              disabled={disabled}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </Button>
          ))}
        </div>
        <span className='min-w-16 text-center text-sm sm:hidden'>
          {safePage} / {safeTotalPages}
        </span>

        <Button
          type='button'
          variant='outline'
          size='icon-sm'
          aria-label='Go to next page'
          disabled={disabled || safePage >= safeTotalPages}
          onClick={() => setPage(safePage + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon-sm'
          aria-label='Go to last page'
          disabled={disabled || safePage >= safeTotalPages}
          onClick={() => setPage(safeTotalPages)}
        >
          <ChevronLast aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

export { Pagination, type PaginationProps };
