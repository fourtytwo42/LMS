"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900 p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Something went wrong!
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {error.message || "An unexpected error occurred"}
        </p>
        <Button onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}

