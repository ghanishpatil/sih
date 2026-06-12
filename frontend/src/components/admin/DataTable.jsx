import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button.jsx'
import { cn } from '@/utils/cn.js'

const selectionColumn = {
  id: '__select',
  size: 42,
  header: ({ table }) => (
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-[rgb(var(--border))] text-brand-600 focus:ring-brand-500"
      checked={table.getIsAllRowsSelected()}
      ref={(el) => {
        if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
      }}
      onChange={table.getToggleAllRowsSelectedHandler()}
      onClick={(e) => e.stopPropagation()}
      aria-label="Select all rows"
    />
  ),
  cell: ({ row }) => (
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-[rgb(var(--border))] text-brand-600 focus:ring-brand-500"
      checked={row.getIsSelected()}
      disabled={!row.getCanSelect()}
      onChange={row.getToggleSelectedHandler()}
      onClick={(e) => e.stopPropagation()}
      aria-label="Select row"
    />
  ),
}

/** TanStack Table wrapper — pagination, global filter, sticky header, optional row selection. */
export function DataTable({
  columns,
  data,
  globalFilter,
  onGlobalFilterChange,
  filterPlaceholder = 'Search…',
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  getRowId = (row) => row.id,
  onRowClick,
}) {
  const mergedColumns = useMemo(
    () => (enableRowSelection ? [selectionColumn, ...columns] : columns),
    [enableRowSelection, columns],
  )

  const table = useReactTable({
    data,
    columns: mergedColumns,
    state: {
      globalFilter,
      ...(enableRowSelection ? { rowSelection } : {}),
    },
    onGlobalFilterChange,
    enableRowSelection,
    onRowSelectionChange: enableRowSelection ? onRowSelectionChange : undefined,
    getRowId: enableRowSelection ? getRowId : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  })

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] pb-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-2 pl-10 pr-4 text-sm text-ink-900 shadow-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder={filterPlaceholder}
            value={globalFilter ?? ''}
            onChange={(e) => onGlobalFilterChange?.(e.target.value)}
          />
        </div>
        <p className="text-xs text-ink-500">
          {table.getFilteredRowModel().rows.length} row(s)
          {enableRowSelection && rowSelection && Object.keys(rowSelection).filter((k) => rowSelection[k]).length > 0
            ? ` · ${Object.keys(rowSelection).filter((k) => rowSelection[k]).length} selected`
            : ''}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))]" data-lenis-prevent>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]">
                {hg.headers.map((h) => (
                  <th key={h.id} className="whitespace-nowrap px-3 py-3 font-semibold text-ink-800">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={mergedColumns.length} className="px-3 py-12 text-center text-ink-500">
                  No rows match your filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-[rgb(var(--border))]/70 hover:bg-[rgb(var(--surface-muted))]/50',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={(e) => {
                    if (!onRowClick) return
                    if (e.target.closest('input,button,a,select,textarea')) return
                    onRowClick(row.original)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-top text-ink-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-500">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" type="button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
