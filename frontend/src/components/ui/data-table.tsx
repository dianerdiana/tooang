import * as React from 'react';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  useReactTable,
} from '@tanstack/react-table';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/loading-state';
import { Pagination, type PaginationProps } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { cn } from '@/utils/utils';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  enableRowSelection?: TableOptions<TData>['enableRowSelection'];
  getRowId?: TableOptions<TData>['getRowId'];
  pagination?: PaginationProps;
  toolbar?: React.ReactNode;
  isLoading?: boolean;
  error?: React.ReactNode;
  onRetry?: () => void;
  isRetrying?: boolean;
  emptyState?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  skeletonRowCount?: number;
  ariaLabel?: string;
  className?: string;
  tableClassName?: string;
};

function DataTable<TData, TValue>({
  columns,
  data,
  sorting = [],
  onSortingChange,
  rowSelection = {},
  onRowSelectionChange,
  enableRowSelection,
  getRowId,
  pagination,
  toolbar,
  isLoading = false,
  error,
  onRetry,
  isRetrying,
  emptyState,
  emptyTitle,
  emptyDescription,
  skeletonRowCount = 5,
  ariaLabel = 'Data table',
  className,
  tableClassName,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange,
    onRowSelectionChange,
    enableRowSelection,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  const columnCount = Math.max(1, table.getVisibleLeafColumns().length);
  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div data-slot='data-table' className={cn('space-y-4', className)}>
      {toolbar}
      <div className='rounded-surface border bg-table text-table-foreground shadow-xs'>
        <Table className={tableClassName} aria-label={ariaLabel}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={columnCount} className='p-0'>
                  <TableSkeleton rows={skeletonRowCount} columns={columnCount} className='py-3' />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={columnCount} className='p-4'>
                  <ErrorState
                    compact
                    description={error}
                    onRetry={onRetry}
                    isRetrying={isRetrying}
                    className='border-0 bg-transparent'
                  />
                </TableCell>
              </TableRow>
            ) : hasRows ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className='hover:bg-transparent'>
                <TableCell colSpan={columnCount} className='p-4'>
                  {emptyState ?? (
                    <EmptyState
                      compact
                      title={emptyTitle}
                      description={emptyDescription}
                      className='border-0 bg-transparent'
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && <Pagination {...pagination} disabled={pagination.disabled || isLoading} />}
    </div>
  );
}

export { DataTable, type DataTableProps };
