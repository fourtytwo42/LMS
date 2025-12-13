"use client";

import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search } from "lucide-react";

interface TableToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: Array<{
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    className?: string;
  }>;
  actions?: ReactNode;
  className?: string;
}

export function TableToolbar({
  search,
  filters = [],
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div className={`mb-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center ${className || ""}`}>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
        {filters.map((filter, index) => (
          <Select
            key={index}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className={filter.className || "w-full sm:w-40"}
          >
            {filter.placeholder && <option value="">{filter.placeholder}</option>}
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}
        {search && (
          <div className="w-full sm:w-64">
            <Input
              placeholder={search.placeholder || "Search..."}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

