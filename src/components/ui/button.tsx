import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          {
            "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800": variant === "primary",
            "bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400": variant === "secondary",
            "bg-red-600 text-white hover:bg-red-700 active:bg-red-800": variant === "danger",
            "bg-transparent hover:bg-gray-100 active:bg-gray-200": variant === "ghost",
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2.5 text-base": size === "md",
            "px-6 py-3 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

