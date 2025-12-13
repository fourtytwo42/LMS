import { InputHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, value, onChange, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            {...props}
            className={cn(
              "w-full rounded-lg border px-4 py-2.5 text-base",
              "text-gray-900 bg-white dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              "transition-colors duration-200",
              icon && "pl-10",
              error
                ? "border-red-500 dark:border-red-400 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...(value !== undefined && { value })}
            {...(onChange && { onChange })}
          />
        </div>
        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

