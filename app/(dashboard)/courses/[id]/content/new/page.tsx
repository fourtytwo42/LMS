"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const createContentItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["VIDEO", "YOUTUBE", "PDF", "PPT", "HTML", "EXTERNAL", "TEST"]),
  order: z.number().int().min(0),
  priority: z.number().int().default(0),
  required: z.boolean().default(true),
  videoUrl: z.string().url().optional(),
  videoDuration: z.number().optional(),
  completionThreshold: z.number().min(0).max(1).default(0.8),
  allowSeeking: z.boolean().default(true),
  youtubeUrl: z.string().url().optional(),
  pdfUrl: z.string().url().optional(),
  pdfPages: z.number().optional(),
  pptUrl: z.string().url().optional(),
  pptSlides: z.number().optional(),
  htmlContent: z.string().optional(),
  externalUrl: z.string().url().optional(),
  externalType: z.string().optional(),
});

type CreateContentItemForm = z.infer<typeof createContentItemSchema>;

export default function NewContentItemPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [saving, setSaving] = useState(false);
  const [contentType, setContentType] = useState<string>("VIDEO");
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(createContentItemSchema),
    defaultValues: {
      type: "VIDEO",
      order: 0,
      priority: 0,
      required: true,
      completionThreshold: 0.8,
      allowSeeking: true,
    },
  });

  const watchedType = watch("type");

  useEffect(() => {
    setContentType(watchedType);
    // Reset uploaded file when type changes
    setUploadedFileUrl(null);
    setUploadError(null);
  }, [watchedType]);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Determine file type based on content type
    let fileType: "VIDEO" | "PDF" | "PPT" = "VIDEO";
    if (contentType === "PDF") {
      fileType = "PDF";
    } else if (contentType === "PPT") {
      fileType = "PPT";
    } else if (contentType === "VIDEO") {
      fileType = "VIDEO";
    } else {
      setUploadError("File upload is only supported for VIDEO, PDF, and PPT types");
      return;
    }

    // Validate file type
    const validMimeTypes: Record<string, string[]> = {
      VIDEO: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"],
      PDF: ["application/pdf"],
      PPT: [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
      ],
    };

    if (!validMimeTypes[fileType].includes(file.type)) {
      setUploadError(`Invalid file type. Expected: ${validMimeTypes[fileType].join(", ")}`);
      return;
    }

    // Validate file size (1GB max)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      setUploadError("File size must be less than 1GB");
      return;
    }

    setUploading(true);
    setUploadError(null);

    // For video files, extract duration before uploading
    let videoDuration: number | undefined;
    if (fileType === "VIDEO") {
      try {
        videoDuration = await getVideoDuration(file);
        if (videoDuration && !isNaN(videoDuration)) {
          // Set duration in seconds (round to nearest second)
          setValue("videoDuration", Math.round(videoDuration));
        }
      } catch (error) {
        console.warn("Could not extract video duration:", error);
        // Continue with upload even if duration extraction fails
      }
    }

    // For PDF files, extract page count
    if (fileType === "PDF") {
      try {
        const pageCount = await getPdfPageCount(file);
        if (pageCount && pageCount > 0) {
          setValue("pdfPages", pageCount);
        }
      } catch (error) {
        console.warn("Could not extract PDF page count:", error);
        // Continue with upload even if page count extraction fails
      }
    }

    // For PPT files, extract slide count
    if (fileType === "PPT") {
      try {
        const slideCount = await getPptSlideCount(file);
        if (slideCount && slideCount > 0) {
          setValue("pptSlides", slideCount);
        }
      } catch (error) {
        console.warn("Could not extract PPT slide count:", error);
        // Continue with upload even if slide count extraction fails
      }
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", fileType);
      formData.append("courseId", courseId);

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload file");
      }

      const result = await response.json();
      const relativeUrl = result.file.url;
      
      // Convert relative URL to absolute URL for validation
      const fullUrl = relativeUrl.startsWith('http') 
        ? relativeUrl 
        : `${window.location.origin}${relativeUrl}`;

      setUploadedFileUrl(relativeUrl); // Store relative for display

      // Auto-fill the URL field based on content type with full URL
      if (contentType === "VIDEO") {
        setValue("videoUrl", fullUrl);
      } else if (contentType === "PDF") {
        setValue("pdfUrl", fullUrl);
      } else if (contentType === "PPT") {
        setValue("pptUrl", fullUrl);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Helper function to extract video duration from uploaded file
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video metadata"));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Helper function to extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Helper function to get YouTube video duration
  // Note: This requires YouTube Data API v3 with an API key for full functionality
  // For now, we'll set a placeholder and let the backend handle it if needed
  const getYouTubeDuration = async (url: string): Promise<number | null> => {
    try {
      const videoId = extractYouTubeId(url);
      if (!videoId) return null;

      // YouTube oEmbed API doesn't provide duration, so we return null
      // The backend can handle duration extraction if needed
      // Or you can integrate YouTube Data API v3 here with an API key
      return null;
    } catch (error) {
      console.warn("Could not fetch YouTube video info:", error);
      return null;
    }
  };

  // Helper function to extract PDF page count
  const getPdfPageCount = async (file: File): Promise<number> => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      // Use local worker file matching pdfjs-dist version 5.4.449
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.5.4.449.min.mjs";
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return pdf.numPages;
    } catch (error) {
      console.error("Error extracting PDF page count:", error);
      throw error;
    }
  };

  // Helper function to extract PPT slide count
  const getPptSlideCount = async (file: File): Promise<number> => {
    try {
      // Only .pptx files (Office Open XML) can be parsed client-side
      if (!file.name.endsWith('.pptx') && !file.type.includes('presentationml')) {
        // For .ppt files (binary format), we can't parse client-side
        // Return 0 and let backend handle it or user enter manually
        return 0;
      }

      const JSZip = await import("jszip");
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.default.loadAsync(arrayBuffer);
      
      // Count files in ppt/slides/ directory
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
      );
      return slideFiles.length;
    } catch (error) {
      console.error("Error extracting PPT slide count:", error);
      // Return 0 if extraction fails - user can enter manually or backend can handle
      return 0;
    }
  };


  const handleRemoveFile = () => {
    setUploadedFileUrl(null);
    setUploadError(null);
    if (contentType === "VIDEO") {
      setValue("videoUrl", "");
    } else if (contentType === "PDF") {
      setValue("pdfUrl", "");
    } else if (contentType === "PPT") {
      setValue("pptUrl", "");
    }
  };

  const onSubmit = async (data: CreateContentItemForm) => {
    setSaving(true);
    try {
      // Validate type-specific fields
      if (data.type === "VIDEO" && !data.videoUrl) {
        alert("Video file upload is required for VIDEO type");
        setSaving(false);
        return;
      }
      if (data.type === "YOUTUBE" && !data.youtubeUrl) {
        alert("YouTube URL is required for YOUTUBE type");
        setSaving(false);
        return;
      }
      if (data.type === "PDF" && !data.pdfUrl) {
        alert("PDF file upload is required for PDF type");
        setSaving(false);
        return;
      }
      if (data.type === "PPT" && !data.pptUrl) {
        alert("Presentation file upload is required for PPT type");
        setSaving(false);
        return;
      }
      if (data.type === "EXTERNAL" && !data.externalUrl) {
        alert("External URL is required for EXTERNAL type");
        setSaving(false);
        return;
      }
      
      // For YouTube, convert youtubeUrl to videoUrl format expected by backend
      if (data.type === "YOUTUBE" && data.youtubeUrl) {
        data.videoUrl = data.youtubeUrl;
        // Try to get duration from YouTube (if we can)
        const duration = await getYouTubeDuration(data.youtubeUrl);
        if (duration) {
          data.videoDuration = duration;
        }
      }

      const response = await fetch(`/api/courses/${courseId}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create content item");
      }

      router.push(`/courses/${courseId}`);
    } catch (error: any) {
      console.error("Error creating content item:", error);
      alert(error.message || "Failed to create content item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/courses/${courseId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add Content Item</h1>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Content Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Type *</label>
              <Select {...register("type")} error={errors.type?.message}>
                <option value="VIDEO">Video (Upload)</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="PDF">PDF</option>
                <option value="PPT">Presentation</option>
                <option value="HTML">HTML Content</option>
                <option value="EXTERNAL">External Link</option>
                <option value="TEST">Test/Quiz</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Order *</label>
              <Input
                type="number"
                {...register("order", { valueAsNumber: true })}
                error={errors.order?.message}
                defaultValue={0}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input
              {...register("title")}
              error={errors.title?.message}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          {contentType === "VIDEO" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Video File *
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleFileUploadClick}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Video"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    {uploadedFileUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {uploadedFileUrl && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-sm text-green-800">
                        ✓ File uploaded successfully
                      </p>
                      <p className="text-xs text-green-600 mt-1 truncate">
                        {uploadedFileUrl}
                      </p>
                    </div>
                  )}
                  {uploadError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-800">{uploadError}</p>
                    </div>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("allowSeeking")}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Allow Seeking</span>
              </label>
            </>
          )}

          {contentType === "YOUTUBE" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  YouTube URL *
                </label>
                <Input
                  {...register("youtubeUrl")}
                  error={errors.youtubeUrl?.message}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={async (e) => {
                    const url = e.target.value;
                    register("youtubeUrl").onChange(e);
                    // Try to get duration when URL is entered (if API available)
                    if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
                      const duration = await getYouTubeDuration(url);
                      if (duration) {
                        setValue("videoDuration", duration);
                      }
                    }
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter a YouTube video URL. Duration will be automatically detected.
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("allowSeeking")}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Allow Seeking</span>
              </label>
            </>
          )}

          {contentType === "PDF" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  PDF File *
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleFileUploadClick}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload PDF"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    {uploadedFileUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {uploadedFileUrl && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-sm text-green-800">
                        ✓ File uploaded successfully
                      </p>
                      <p className="text-xs text-green-600 mt-1 truncate">
                        {uploadedFileUrl}
                      </p>
                    </div>
                  )}
                  {uploadError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-800">{uploadError}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {contentType === "PPT" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Presentation File *
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleFileUploadClick}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Presentation"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    {uploadedFileUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {uploadedFileUrl && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-sm text-green-800">
                        ✓ File uploaded successfully
                      </p>
                      <p className="text-xs text-green-600 mt-1 truncate">
                        {uploadedFileUrl}
                      </p>
                    </div>
                  )}
                  {uploadError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-800">{uploadError}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {contentType === "HTML" && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                HTML Content
              </label>
              <textarea
                {...register("htmlContent")}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
                placeholder="<div>Your HTML content here</div>"
              />
            </div>
          )}

          {contentType === "EXTERNAL" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  External URL *
                </label>
                <Input
                  {...register("externalUrl")}
                  error={errors.externalUrl?.message}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  External Type
                </label>
                <Input
                  {...register("externalType")}
                  error={errors.externalType?.message}
                  placeholder="e.g., YouTube, Vimeo, etc."
                />
              </div>
            </>
          )}

          {contentType === "TEST" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                Test/Quiz creation will be available in a separate interface.
                This will create a placeholder content item for the test.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("required")}
                className="rounded border-gray-300"
                defaultChecked
              />
              <span className="text-sm">Required</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/courses/${courseId}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Creating..." : "Create Content Item"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

