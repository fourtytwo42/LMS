import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={cn("w-full border-collapse", className)}
          {...props}
        />
      </div>
    );
  }
);
Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={cn("bg-gray-50 dark:bg-gray-800", className)}
      {...props}
    />
  );
});
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return <tbody ref={ref} className={cn("", className)} {...props} />;
});
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  return (
    <tr
      ref={ref}
      className={cn("border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800", className)}
      {...props}
    />
  );
});
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  return (
    <th
      ref={ref}
      className={cn("px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100", className)}
      {...props}
    />
  );
});
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={cn("px-4 py-3 text-sm text-gray-700 dark:text-gray-300", className)}
      {...props}
    />
  );
});
TableCell.displayName = "TableCell";

