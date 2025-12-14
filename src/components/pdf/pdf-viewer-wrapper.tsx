"use client";

import { PDFViewer } from "./pdf-viewer";

interface PdfViewerWrapperProps {
  fileUrl: string;
  title?: string;
  downloadUrl?: string;
  downloadLabel?: string;
}

// Wrapper to match the interface expected by lazy loader
export function PdfViewerWrapper({ fileUrl, title, downloadUrl, downloadLabel }: PdfViewerWrapperProps) {
  return <PDFViewer pdfUrl={fileUrl} title={title} downloadUrl={downloadUrl} downloadLabel={downloadLabel} />;
}

