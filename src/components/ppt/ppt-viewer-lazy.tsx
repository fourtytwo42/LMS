"use client";

import dynamic from "next/dynamic";

// PPT files are converted to PDF for display, so we use the PDF viewer
// But downloads should serve the original PPTX file
const PdfViewerLazy = dynamic(() => import("../pdf/pdf-viewer-lazy").then((mod) => ({ default: mod.PdfViewerLazy })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <div className="text-gray-600 dark:text-gray-400">Loading presentation viewer...</div>
    </div>
  ),
});

interface PPTViewerLazyProps {
  fileUrl: string;
  title?: string;
}

export function PPTViewerLazy({ fileUrl, title }: PPTViewerLazyProps) {
  // Convert PPTX URL to PDF URL for display
  const pdfUrl = fileUrl.replace(/\.pptx?$/i, ".pdf");
  // Keep original PPTX URL for downloads
  const originalPptUrl = fileUrl;
  return (
    <PdfViewerLazy 
      fileUrl={pdfUrl} 
      title={title}
      downloadUrl={originalPptUrl}
      downloadLabel="Download PPT"
    />
  );
}

