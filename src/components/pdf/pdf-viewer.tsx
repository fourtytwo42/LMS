"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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
  contentItemId?: string; // For progress tracking
  totalPages?: number; // Total pages (if known from content item)
  completionThreshold?: number; // Completion threshold (default 0.8)
  onProgressUpdate?: (progress: number, completed: boolean) => void; // Callback for progress updates
  initialPage?: number; // Initial page to load (for resuming)
}

export function PDFViewer({ 
  pdfUrl, 
  title, 
  downloadUrl, 
  downloadLabel = "Download PDF",
  contentItemId,
  totalPages: propTotalPages,
  completionThreshold = 0.8,
  onProgressUpdate,
  initialPage,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedPages, setViewedPages] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    
    // If we have an initial page, start there and mark pages up to it as viewed
    if (initialPage && initialPage > 1 && initialPage <= numPages) {
      setPageNumber(initialPage);
      const pagesToMark = Array.from({ length: initialPage }, (_, i) => i + 1);
      setViewedPages(new Set(pagesToMark));
    } else {
      // Mark first page as viewed
      setViewedPages(new Set([1]));
    }
  }

  // Get page dimensions when page loads
  const onPageLoadSuccess = (page: any) => {
    if (page) {
      setPageWidth(page.width);
      setPageHeight(page.height);
    }
  };

  function onDocumentLoadError(error: Error) {
    setError(error.message);
    setLoading(false);
  }

  // Calculate progress and completion status
  useEffect(() => {
    if (!numPages) return;

    const totalPages = propTotalPages || numPages;
    const progress = viewedPages.size / totalPages;
    setCurrentProgress(progress);
    setCompleted(progress >= completionThreshold);
  }, [viewedPages, numPages, propTotalPages, completionThreshold]);

  // Track page views and update progress to server
  useEffect(() => {
    if (!contentItemId || !numPages) return;

    const totalPages = propTotalPages || numPages;
    const progress = viewedPages.size / totalPages;

    // Clear any pending progress update
    if (progressUpdateTimeoutRef.current) {
      clearTimeout(progressUpdateTimeoutRef.current);
    }

    // Send progress update immediately when page changes, then debounce subsequent updates
    const sendProgressUpdate = async () => {
      try {
        console.log("Sending progress update:", {
          contentItemId,
          progress,
          pagesViewed: viewedPages.size,
          totalPages,
          lastPage: pageNumber,
        });
        
        const response = await fetch("/api/progress/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contentItemId,
            progress,
            pagesViewed: viewedPages.size,
            totalPages,
            lastPage: pageNumber, // Include current page number
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Progress update response:", data);
          setCompleted(data.completed);
          if (onProgressUpdate) {
            onProgressUpdate(data.progress, data.completed);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Progress update failed:", response.status, errorData);
        }
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    };

    // Send immediate update when page changes
    sendProgressUpdate();

    // Also set up debounced updates for continuous viewing
    progressUpdateTimeoutRef.current = setTimeout(() => {
      sendProgressUpdate();
    }, 5000); // Update every 5 seconds while viewing

    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
      }
    };
  }, [viewedPages, pageNumber, numPages, contentItemId, propTotalPages, completionThreshold, onProgressUpdate]);

  // Track when user navigates to a new page
  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
    setViewedPages((prev) => new Set([...prev, newPageNumber]));
    // The useEffect will handle sending the progress update when viewedPages changes
  };

  // Handle fullscreen
  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  };

  // Listen for fullscreen changes and window resize
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleResize = () => {
      // Recalculate page width if needed when window resizes
      if (isFullscreen && pageWidth && pageHeight) {
        calculatePageWidth();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleResize);
    };
  }, [isFullscreen, pageWidth, pageHeight]);

  // Calculate page width to fit viewport height in fullscreen
  const calculatePageWidth = () => {
    if (!pageWidth || !pageHeight || typeof window === "undefined") return null;
    
    const viewportHeight = window.innerHeight - 200; // Account for controls and padding
    const viewportWidth = window.innerWidth - 50; // Account for padding
    
    // Calculate width based on height constraint
    const heightBasedWidth = (viewportHeight / pageHeight) * pageWidth;
    
    // Use the smaller of height-based or width-based sizing
    return Math.min(heightBasedWidth, viewportWidth);
  };


  return (
    <div ref={containerRef} className="pdf-viewer w-full">
      {title && <h3 className="mb-4 text-xl font-semibold">{title}</h3>}
      
      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
          Error loading PDF: {error}
        </div>
      )}

      {completed && (
        <div className="mb-4 rounded-lg bg-green-100 dark:bg-green-900 p-4 text-green-800 dark:text-green-200">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-semibold">Content completed! Next content unlocked.</span>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {pageNumber} of {numPages || "..."}
          </span>
          <button
            onClick={() => handlePageChange(Math.min(numPages || 1, pageNumber + 1))}
            disabled={!numPages || pageNumber >= numPages}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFullscreen}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize className="h-4 w-4" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize className="h-4 w-4" />
                Fullscreen
              </>
            )}
          </button>
          <a
            href={downloadUrl || pdfUrl}
            download
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {downloadLabel}
          </a>
        </div>
      </div>

      <div className={cn(
        "flex justify-center bg-gray-100 dark:bg-gray-800 p-4",
        isFullscreen && "overflow-y-auto max-h-screen"
      )}>
        {loading && <div className="py-8 text-gray-600 dark:text-gray-400">Loading PDF...</div>}
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="py-8 text-gray-600 dark:text-gray-400">Loading PDF...</div>}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            onLoadSuccess={onPageLoadSuccess}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
            width={(() => {
              if (isFullscreen && pageWidth && pageHeight) {
                const calculatedWidth = calculatePageWidth();
                return calculatedWidth || (typeof window !== "undefined" ? window.innerWidth - 50 : 1200);
              }
              return Math.min(800, typeof window !== "undefined" ? window.innerWidth - 100 : 800);
            })()}
            scale={1.0}
            renderMode="canvas"
          />
        </Document>
      </div>
    </div>
  );
}

