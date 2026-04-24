'use client';
import type { ReactNode } from 'react';

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  cell: (row: T) => ReactNode;
  mobileHide?: boolean;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  empty?: string;
  mobileCard?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  empty = 'Немає даних',
  mobileCard,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm py-6 text-center">{empty}</p>;
  }
  return (
    <div className={className}>
      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-white/10">
              {columns.map(c => (
                <th
                  key={c.key}
                  className={`py-2 px-3 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                className={`border-b border-white/5 ${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(c => (
                  <td key={c.key} className={`py-2 px-3 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {rows.map((row, i) => (
          <div
            key={getRowKey(row, i)}
            className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 ${onRowClick ? 'cursor-pointer active:bg-white/10' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {mobileCard ? (
              mobileCard(row)
            ) : (
              <div className="space-y-1">
                {columns.filter(c => !c.mobileHide).map(c => (
                  <div key={c.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-400 text-xs shrink-0">{c.header}</span>
                    <span className={c.align === 'right' ? 'text-right' : 'text-left'}>{c.cell(row)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
