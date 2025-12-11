import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            "w-full rounded-lg border px-4 py-2.5 text-base",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            "transition-colors duration-200 bg-white",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

