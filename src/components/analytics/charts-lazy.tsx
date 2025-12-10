"use client";

import dynamic from "next/dynamic";

// Lazy load Recharts to improve initial page load
export const ChartsLazy = dynamic(
  () => import("recharts").then((mod) => ({
    BarChart: mod.BarChart,
    Bar: mod.Bar,
    XAxis: mod.XAxis,
    YAxis: mod.YAxis,
    CartesianGrid: mod.CartesianGrid,
    Tooltip: mod.Tooltip,
    Legend: mod.Legend,
    ResponsiveContainer: mod.ResponsiveContainer,
    PieChart: mod.PieChart,
    Pie: mod.Pie,
    Cell: mod.Cell,
    LineChart: mod.LineChart,
    Line: mod.Line,
  })),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading charts...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

