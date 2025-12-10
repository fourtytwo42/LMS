"use client";

import dynamic from "next/dynamic";

// Lazy load the PDF viewer to improve initial page load
export const PdfViewerLazy = dynamic(
  () => import("./pdf-viewer-wrapper").then((mod) => ({ default: mod.PdfViewerWrapper })),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

