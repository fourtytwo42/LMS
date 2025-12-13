"use client";

import { ReactNode } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { CheckSquare, Square } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
};

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  disabled?: boolean;
  show?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Record<string, Column<T>>;
  loading?: boolean;
  emptyMessage?: string;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectItem?: (id: string, checked: boolean) => void;
  getId: (item: T) => string;
  bulkActions?: BulkAction[];
  bulkActionsLabel?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = "No items found",
  selectedIds,
  onSelectAll,
  onSelectItem,
  getId,
  bulkActions = [],
  bulkActionsLabel,
  className,
}: DataTableProps<T>) {
  const hasSelection = selectedIds && selectedIds.size > 0;
  const isAllSelected = data.length > 0 && selectedIds && data.every((item) => selectedIds.has(getId(item)));

  return (
    <Card className={className}>
      {hasSelection && bulkActions.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {bulkActionsLabel || `${selectedIds.size} item(s) selected`}
          </div>
          <div className="flex gap-2">
            {bulkActions
              .filter((action) => action.show !== false)
              .map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${action.variant === "danger" 
                      ? "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" 
                      : action.variant === "primary"
                      ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {action.icon}
                    {action.label}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {onSelectAll && (
                  <TableHead className="w-12">
                    <button
                      onClick={() => onSelectAll(!isAllSelected)}
                      className="flex items-center justify-center"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                )}
                {Object.entries(columns).map(([key, column]) => (
                  <TableHead key={key} className={column.className}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={getId(item)}>
                  {onSelectItem && (
                    <TableCell>
                      <button
                        onClick={() => onSelectItem(getId(item), !selectedIds?.has(getId(item)))}
                        className="flex items-center justify-center"
                      >
                        {selectedIds?.has(getId(item)) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </TableCell>
                  )}
                  {Object.entries(columns).map(([key, column]) => (
                    <TableCell key={key} className={column.className}>
                      {column.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

