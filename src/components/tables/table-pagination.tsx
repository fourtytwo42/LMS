"use client";

import { Button } from "@/components/ui/button";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TablePaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  itemName?: string;
  className?: string;
}

export function TablePagination({
  pagination,
  onPageChange,
  itemName = "items",
  className,
}: TablePaginationProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className={`mt-4 flex items-center justify-between ${className || ""}`}>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
        {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
        of {pagination.total} {itemName}
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={pagination.page === 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

