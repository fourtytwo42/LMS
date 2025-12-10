"use client";

import { PDFViewer } from "./pdf-viewer";

interface PdfViewerWrapperProps {
  fileUrl: string;
  title?: string;
}

// Wrapper to match the interface expected by lazy loader
export function PdfViewerWrapper({ fileUrl, title }: PdfViewerWrapperProps) {
  return <PDFViewer pdfUrl={fileUrl} title={title} />;
}

