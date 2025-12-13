import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: {
        backgroundColor: "var(--badge-default-bg)",
        color: "var(--badge-default-text)",
      },
      success: {
        backgroundColor: "var(--badge-success-bg)",
        color: "var(--badge-success-text)",
      },
      warning: {
        backgroundColor: "var(--badge-warning-bg)",
        color: "var(--badge-warning-text)",
      },
      danger: {
        backgroundColor: "var(--badge-danger-bg)",
        color: "var(--badge-danger-text)",
      },
      info: {
        backgroundColor: "var(--badge-info-bg)",
        color: "var(--badge-info-text)",
      },
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium badge-icon",
          className
        )}
        style={variantStyles[variant]}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

