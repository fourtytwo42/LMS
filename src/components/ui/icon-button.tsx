"use client";

import { ReactNode, useState } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils/cn";

interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "ghost" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  icon,
  label,
  onClick,
  variant = "ghost",
  size = "sm",
  disabled = false,
  className,
}: IconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={disabled}
        className={cn("relative", className)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={label}
      >
        {icon}
      </Button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg z-50 whitespace-nowrap">
          {label}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
}

