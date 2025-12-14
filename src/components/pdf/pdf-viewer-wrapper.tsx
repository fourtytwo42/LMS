"use client";

import { PDFViewer } from "./pdf-viewer";

interface PdfViewerWrapperProps {
  fileUrl: string;
  title?: string;
  downloadUrl?: string;
  downloadLabel?: string;
  contentItemId?: string;
  totalPages?: number;
  completionThreshold?: number;
  onProgressUpdate?: (progress: number, completed: boolean) => void;
  initialPage?: number;
}

// Wrapper to match the interface expected by lazy loader
export function PdfViewerWrapper({ 
  fileUrl, 
  title, 
  downloadUrl, 
  downloadLabel,
  contentItemId,
  totalPages,
  completionThreshold,
  onProgressUpdate,
  initialPage,
}: PdfViewerWrapperProps) {
  return (
    <PDFViewer 
      pdfUrl={fileUrl} 
      title={title} 
      downloadUrl={downloadUrl} 
      downloadLabel={downloadLabel}
      contentItemId={contentItemId}
      totalPages={totalPages}
      completionThreshold={completionThreshold}
      onProgressUpdate={onProgressUpdate}
      initialPage={initialPage}
    />
  );
}

