"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface TabsProps {
  children: ReactNode;
  className?: string;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  active?: boolean;
  children: ReactNode;
  className?: string;
}

export function Tabs({ children, className }: TabsProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  );
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn("flex border-b border-gray-200 dark:border-gray-700 mb-6", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, active, onClick, children, className }: TabsTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
        active
          ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
          : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, active, children, className }: TabsContentProps) {
  if (!active) return null;

  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  );
}

