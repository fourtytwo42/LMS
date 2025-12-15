"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PPTXViewer } from "pptxviewjs";

interface PPTViewerProps {
  pptUrl: string;
  title?: string;
}

export function PPTViewer({ pptUrl, title }: PPTViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerInstanceRef = useRef<PPTXViewer | null>(null);
  const [canvasMounted, setCanvasMounted] = useState(false);

  const loadPresentation = useCallback(async () => {
    if (!canvasRef.current) {
      console.log("PPT Viewer: Canvas not available yet");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("PPT Viewer: Starting to load presentation from:", pptUrl);

      // Dynamically import PptxViewJS
      console.log("PPT Viewer: Importing PptxViewJS library...");
      const PptxViewJSModule = await import("pptxviewjs");
      console.log("PPT Viewer: Library imported:", PptxViewJSModule);
      
      // The library exports PPTXViewer as a named export, or via default.PPTXViewer
      const PPTXViewer = PptxViewJSModule.PPTXViewer || (PptxViewJSModule.default && PptxViewJSModule.default.PPTXViewer);
      if (!PPTXViewer) {
        console.error("PPT Viewer: Available exports:", Object.keys(PptxViewJSModule));
        throw new Error("PPTXViewer class not found in pptxviewjs library. Available exports: " + Object.keys(PptxViewJSModule).join(", "));
      }
      console.log("PPT Viewer: PPTXViewer class found");

      // Render the first slide (index 0) explicitly with canvas
      console.log("PPT Viewer: Rendering first slide...");
      if (!canvasRef.current) {
        throw new Error("Canvas not available for rendering");
      }
      
      const canvas = canvasRef.current;
      
      // Set canvas dimensions - use a good size for display
      // Standard PowerPoint is typically 10" x 7.5" (4:3) or 10" x 5.625" (16:9)
      // At 96 DPI: 960x720 (4:3) or 960x540 (16:9)
      // Let's use 16:9 for modern presentations
      const canvasWidth = 1280;
      const canvasHeight = 720;
      
      // Set canvas internal dimensions (not CSS size)
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      console.log("PPT Viewer: Set canvas dimensions to", canvasWidth, "x", canvasHeight);
      
      // Clear the canvas with white background
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.log("PPT Viewer: Cleared canvas with white background");
      }
      
      // Create viewer instance with canvas and fit mode
      console.log("PPT Viewer: Creating viewer instance...");
      const viewer = new PPTXViewer({
        canvas: canvas,
        slideSizeMode: 'fit', // Fit slide to canvas while maintaining aspect ratio
        backgroundColor: '#ffffff',
      });
      console.log("PPT Viewer: Viewer instance created");

      viewerInstanceRef.current = viewer;

      // Load the presentation - convert blob to ArrayBuffer for loadFile
      console.log("PPT Viewer: Fetching presentation from URL...");
      try {
        const response = await fetch(pptUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch PPT: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        console.log("PPT Viewer: Fetched blob, size:", blob.size, "bytes");
        
        // Convert blob to ArrayBuffer for loadFile
        const arrayBuffer = await blob.arrayBuffer();
        console.log("PPT Viewer: Converted to ArrayBuffer");
        
        // Load from ArrayBuffer
        await viewer.loadFile(arrayBuffer);
        console.log("PPT Viewer: Presentation loaded from ArrayBuffer");
      } catch (fetchError) {
        console.warn("PPT Viewer: Failed to load as ArrayBuffer, trying URL:", fetchError);
        // Fallback to URL loading
        await viewer.loadFromUrl(pptUrl);
        console.log("PPT Viewer: Presentation loaded from URL");
      }

      // Get slide count
      const slideCount = viewer.getSlideCount();
      console.log("PPT Viewer: Slide count:", slideCount);
      setTotalSlides(slideCount);
      
      // Check canvas dimensions after loading (viewer might have changed them)
      console.log("PPT Viewer: Canvas dimensions after load:", canvas.width, "x", canvas.height);
      
      try {
        // Render the first slide - following the library's pattern: render() after loadFile()
        console.log("PPT Viewer: Attempting to render first slide...");
        await viewer.render();
        console.log("PPT Viewer: render() completed");
        
        // Wait a moment for rendering to complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Re-acquire context after render (viewer might have modified canvas)
        const renderCtx = canvas.getContext('2d');
        if (renderCtx) {
          // Check a larger sample area
          const sampleWidth = Math.min(canvas.width, 200);
          const sampleHeight = Math.min(canvas.height, 200);
          const imageData = renderCtx.getImageData(0, 0, sampleWidth, sampleHeight);
          
          // Check for non-white pixels (excluding alpha channel)
          const hasContent = imageData.data.some((pixel, i) => {
            const channel = i % 4;
            if (channel === 3) return false; // Skip alpha
            return pixel !== 0 && pixel !== 255; // Not black or white
          });
          
          console.log("PPT Viewer: Canvas has content:", hasContent);
          console.log("PPT Viewer: Canvas dimensions:", canvas.width, "x", canvas.height);
          
          // Count non-white pixels
          let nonWhitePixels = 0;
          let nonBlackPixels = 0;
          for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            if (r !== 255 || g !== 255 || b !== 255) nonWhitePixels++;
            if (r !== 0 || g !== 0 || b !== 0) nonBlackPixels++;
          }
          console.log("PPT Viewer: Non-white pixels:", nonWhitePixels, "Non-black pixels:", nonBlackPixels, "Total pixels:", imageData.data.length / 4);
        }
        
        // Get the actual current slide index from viewer to sync state
        const actualIndex = viewer.getCurrentSlideIndex();
        console.log("PPT Viewer: Actual slide index from viewer:", actualIndex);
        setCurrentSlide(actualIndex);
      } catch (renderError) {
        console.error("PPT Viewer: Error rendering slide:", renderError);
        console.error("PPT Viewer: Error stack:", renderError instanceof Error ? renderError.stack : 'No stack');
        throw new Error(`Failed to render slide: ${renderError instanceof Error ? renderError.message : String(renderError)}`);
      }

      // Listen for slide change events
      if (viewer.on) {
        viewer.on('slideChange', (slideIndex: unknown) => {
          setCurrentSlide(slideIndex as number);
        });
      }

      setLoading(false);
      console.log("PPT Viewer: Loading complete");
    } catch (err) {
      console.error("PPT Viewer: Error loading presentation:", err);
      console.error("PPT Viewer: Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        pptUrl,
        canvasAvailable: !!canvasRef.current,
      });
      setError(err instanceof Error ? err.message : "Failed to load presentation");
      setLoading(false);
    }
  }, [pptUrl]);

  // Callback ref to know when canvas is mounted
  const canvasCallbackRef = useCallback((element: HTMLCanvasElement | null) => {
    canvasRef.current = element;
    if (element) {
      setCanvasMounted(true);
    }
  }, []);

  // Load presentation when canvas is mounted and URL is available
  useEffect(() => {
    if (canvasMounted && canvasRef.current) {
      loadPresentation();
    }
  }, [canvasMounted, loadPresentation]);

  // Ensure the displayed slide matches currentSlide state
  useEffect(() => {
    if (!loading && viewerInstanceRef.current && canvasRef.current && totalSlides > 0) {
      const viewer = viewerInstanceRef.current;
      const viewerCurrentIndex = viewer.getCurrentSlideIndex();
      
      // If state and viewer are out of sync, render the correct slide
      if (viewerCurrentIndex !== currentSlide) {
        console.log(`PPT Viewer: Syncing slide - state: ${currentSlide}, viewer: ${viewerCurrentIndex}, rendering slide ${currentSlide}`);
        viewer.renderSlide(currentSlide, canvasRef.current).catch((err: Error) => {
          console.error("PPT Viewer: Error syncing slide:", err);
        });
      }
    }
  }, [currentSlide, loading, totalSlides]);

  // Cleanup on unmount or URL change
  useEffect(() => {
    return () => {
      if (viewerInstanceRef.current) {
        try {
          viewerInstanceRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [pptUrl]);

  const nextSlide = async () => {
    if (viewerInstanceRef.current && canvasRef.current && currentSlide < totalSlides - 1) {
      try {
        const nextIndex = currentSlide + 1;
        console.log(`PPT Viewer: Navigating to next slide ${nextIndex}`);
        await viewerInstanceRef.current.renderSlide(nextIndex, canvasRef.current);
        setCurrentSlide(nextIndex);
        console.log(`PPT Viewer: Successfully navigated to slide ${nextIndex}`);
      } catch (e) {
        console.error("Error navigating to next slide:", e);
      }
    }
  };

  const prevSlide = async () => {
    if (viewerInstanceRef.current && canvasRef.current && currentSlide > 0) {
      try {
        const prevIndex = currentSlide - 1;
        console.log(`PPT Viewer: Navigating to previous slide ${prevIndex}`);
        await viewerInstanceRef.current.renderSlide(prevIndex, canvasRef.current);
        setCurrentSlide(prevIndex);
        console.log(`PPT Viewer: Successfully navigated to slide ${prevIndex}`);
      } catch (e) {
        console.error("Error navigating to previous slide:", e);
      }
    }
  };

  if (error) {
    return (
      <div className="rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-red-800 dark:text-red-200 mb-2">{error}</p>
        <a
          href={pptUrl}
          download
          className="text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
        >
          Download presentation instead
        </a>
      </div>
    );
  }

  return (
    <div className="ppt-viewer w-full">
      {title && <h3 className="mb-4 text-xl font-semibold">{title}</h3>}
      
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0 || loading}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? "Loading..." : `Slide ${currentSlide + 1} of ${totalSlides}`}
          </span>
          <button
            onClick={nextSlide}
            disabled={currentSlide >= totalSlides - 1 || loading}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <a
          href={pptUrl}
          download
          className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Download PPT
        </a>
      </div>

      <div className="flex justify-center bg-gray-100 dark:bg-gray-800 p-4 rounded-lg relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 dark:bg-gray-800/90 z-10 rounded-lg">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading presentation...</p>
            </div>
          </div>
        )}
        <div className="w-full max-w-5xl flex justify-center">
          <canvas
            ref={canvasCallbackRef}
            className="rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            style={{ 
              display: "block",
              maxHeight: "80vh",
              maxWidth: "100%",
              width: "auto",
              height: "auto",
              aspectRatio: "16/9",
            }}
          />
        </div>
      </div>
    </div>
  );
}
