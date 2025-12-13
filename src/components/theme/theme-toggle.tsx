"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="!text-gray-900 hover:!text-gray-700 dark:!text-gray-200 dark:hover:!text-white focus:outline-none focus:ring-0"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-gray-900" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}

