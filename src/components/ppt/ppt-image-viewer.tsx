"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PPTImageViewerProps {
  pptUrl: string;
  title?: string;
}

export function PPTImageViewer({ pptUrl, title }: PPTImageViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [totalSlides, setTotalSlides] = useState(0);

  useEffect(() => {
    const extractSlides = async () => {
      try {
        setLoading(true);
        setError(null);

        // Extract the path from the URL
        // URL format: /api/files/serve?path=/ppts/courseId/filename.pptx
        const urlObj = new URL(pptUrl, window.location.origin);
        const pathParam = urlObj.searchParams.get("path");
        
        if (!pathParam) {
          throw new Error("Invalid PPT URL: path parameter not found");
        }

        console.log("PPT Image Viewer: Checking for slides from path:", pathParam);

        // Call the extraction API (it will return cached slides if they exist)
        const response = await fetch("/api/files/ppt/extract-slides", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pptPath: pathParam }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          // If slides are not ready (extraction in progress), show a helpful message
          if (errorData.error === "SLIDES_NOT_READY" || errorData.error === "NOT_FOUND") {
            throw new Error(
              "Slides are still being extracted. Please wait a moment and refresh the page. " +
              "Extraction happens automatically when the file is uploaded and usually takes 10-30 seconds."
            );
          }
          
          throw new Error(errorData.message || "Failed to load slides");
        }

        const data = await response.json();
        console.log("PPT Image Viewer: Slides data:", data);

        if (data.slides && data.slides.length > 0) {
          setSlideImages(data.slides);
          setTotalSlides(data.slides.length);
          setCurrentSlide(0);
          
          if (data.cached) {
            console.log("PPT Image Viewer: Using cached slides");
          } else {
            console.log("PPT Image Viewer: Slides extracted on-demand");
          }
        } else {
          throw new Error("No slides found. The presentation may still be processing.");
        }

        setLoading(false);
      } catch (err) {
        console.error("PPT Image Viewer: Error extracting slides:", err);
        setError(err instanceof Error ? err.message : "Failed to load presentation");
        setLoading(false);
      }
    };

    extractSlides();
  }, [pptUrl]);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Extracting slides from presentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Check if it's an installation error
    const isInstallationError = error.includes("LibreOffice") || error.includes("installation");
    
    return (
      <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
        <p className="text-yellow-800 dark:text-yellow-200 mb-2 font-semibold">
          {isInstallationError ? "LibreOffice Required" : "Error Loading Presentation"}
        </p>
        <p className="text-yellow-700 dark:text-yellow-300 mb-3 text-sm">{error}</p>
        {isInstallationError && (
          <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium mb-1">
              To enable slide viewing, install LibreOffice on the server:
            </p>
            <code className="block text-xs bg-yellow-100 dark:bg-yellow-900 p-2 rounded mt-1">
              sudo apt-get update && sudo apt-get install -y libreoffice
            </code>
          </div>
        )}
        <a
          href={pptUrl}
          download
          className="text-sm text-yellow-700 dark:text-yellow-300 underline hover:no-underline font-medium"
        >
          Download presentation instead
        </a>
      </div>
    );
  }

  if (slideImages.length === 0) {
    return (
      <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
        <p className="text-yellow-800 dark:text-yellow-200">
          No slides found in presentation.
        </p>
      </div>
    );
  }

  return (
    <div className="ppt-image-viewer w-full">
      {title && <h3 className="mb-4 text-xl font-semibold">{title}</h3>}
      
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Slide {currentSlide + 1} of {totalSlides}
          </span>
          <button
            onClick={nextSlide}
            disabled={currentSlide >= totalSlides - 1}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
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

      <div className="flex justify-center bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <div className="w-full max-w-5xl">
          <img
            src={slideImages[currentSlide]}
            alt={`Slide ${currentSlide + 1}`}
            className="w-full h-auto rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            style={{ maxHeight: "80vh" }}
            onError={(e) => {
              console.error("Failed to load slide image:", slideImages[currentSlide]);
              setError(`Failed to load slide ${currentSlide + 1}`);
            }}
          />
        </div>
      </div>

      {/* Thumbnail strip */}
      {totalSlides > 1 && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {slideImages.map((img, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 rounded border-2 overflow-hidden transition-all ${
                  index === currentSlide
                    ? "border-blue-600 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <img
                  src={img}
                  alt={`Slide ${index + 1} thumbnail`}
                  className="w-24 h-16 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

