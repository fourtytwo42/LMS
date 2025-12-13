import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-800",
          "text-gray-900 dark:text-gray-100",
          "p-6 sm:p-8 shadow-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

