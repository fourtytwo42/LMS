"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker - use local worker file matching react-pdf's pdfjs-dist version (5.4.296)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.5.4.296.min.mjs";
}

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
  downloadUrl?: string; // Optional separate URL for downloads (e.g., original PPTX file)
  downloadLabel?: string; // Optional label for download button
}

export function PDFViewer({ pdfUrl, title, downloadUrl, downloadLabel = "Download PDF" }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    setError(error.message);
    setLoading(false);
  }

  return (
    <div className="pdf-viewer w-full">
      {title && <h3 className="mb-4 text-xl font-semibold">{title}</h3>}
      
      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
          Error loading PDF: {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pageNumber} of {numPages || "..."}
          </span>
          <button
            onClick={() => setPageNumber((prev) => Math.min(numPages || 1, prev + 1))}
            disabled={!numPages || pageNumber >= numPages}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
        <a
          href={downloadUrl || pdfUrl}
          download
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
        >
          {downloadLabel}
        </a>
      </div>

      <div className="flex justify-center bg-gray-100 p-4">
        {loading && <div className="py-8 text-gray-600">Loading PDF...</div>}
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="py-8 text-gray-600">Loading PDF...</div>}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
            width={Math.min(800, typeof window !== "undefined" ? window.innerWidth - 100 : 800)}
            scale={1.0}
            renderMode="canvas"
          />
        </Document>
      </div>
    </div>
  );
}

