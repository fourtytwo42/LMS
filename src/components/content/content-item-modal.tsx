"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

const contentItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["VIDEO", "YOUTUBE", "PDF", "PPT", "HTML", "EXTERNAL", "TEST"]),
  order: z.number().int().min(0),
  priority: z.number().int().default(0),
  required: z.boolean().default(true),
  videoUrl: z.string().optional(),
  videoDuration: z.number().optional(),
  completionThreshold: z.number().min(0).max(1).default(0.8),
  allowSeeking: z.boolean().default(true),
  youtubeUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  pdfPages: z.number().optional(),
  pptUrl: z.string().optional(),
  pptSlides: z.number().optional(),
  htmlContent: z.string().optional(),
  externalUrl: z.string().optional(),
  externalType: z.string().optional(),
});

type ContentItemForm = z.infer<typeof contentItemSchema>;

interface ContentItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContentItemForm) => Promise<void>;
  courseId: string;
  existingItem?: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    order: number;
    priority: number;
    required: boolean;
    videoUrl: string | null;
    videoDuration: number | null;
    pdfUrl: string | null;
    pdfPages: number | null;
    pptUrl: string | null;
    pptSlides: number | null;
    htmlContent: string | null;
    externalUrl: string | null;
    externalType: string | null;
    completionThreshold: number;
    allowSeeking: boolean;
  } | null;
  nextOrder?: number;
}

export function ContentItemModal({
  isOpen,
  onClose,
  onSubmit,
  courseId,
  existingItem,
  nextOrder = 0,
}: ContentItemModalProps) {
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
    reset,
  } = useForm<ContentItemForm>({
    resolver: zodResolver(contentItemSchema),
    defaultValues: {
      type: "VIDEO",
      order: nextOrder,
      priority: 0,
      required: true,
      completionThreshold: 0.8,
      allowSeeking: true,
    },
  });

  const watchedType = watch("type");

  useEffect(() => {
    setContentType(watchedType);
    setUploadedFileUrl(null);
    setUploadError(null);
  }, [watchedType]);

  useEffect(() => {
    if (existingItem) {
      reset({
        title: existingItem.title,
        description: existingItem.description || "",
        type: existingItem.type as any,
        order: existingItem.order,
        priority: existingItem.priority,
        required: existingItem.required,
        videoUrl: existingItem.videoUrl || "",
        videoDuration: existingItem.videoDuration || undefined,
        pdfUrl: existingItem.pdfUrl || "",
        pdfPages: existingItem.pdfPages || undefined,
        pptUrl: existingItem.pptUrl || "",
        pptSlides: existingItem.pptSlides || undefined,
        htmlContent: existingItem.htmlContent || "",
        externalUrl: existingItem.externalUrl || "",
        externalType: existingItem.externalType || "",
        completionThreshold: existingItem.completionThreshold,
        allowSeeking: existingItem.allowSeeking,
      });
      setContentType(existingItem.type);
    } else {
      reset({
        type: "VIDEO",
        order: nextOrder,
        priority: 0,
        required: true,
        completionThreshold: 0.8,
        allowSeeking: true,
      });
      setContentType("VIDEO");
    }
  }, [existingItem, nextOrder, reset]);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

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

  const getPptSlideCount = async (file: File): Promise<number> => {
    try {
      if (!file.name.endsWith('.pptx') && !file.type.includes('presentationml')) {
        return 0;
      }
      const JSZip = await import("jszip");
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.default.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
      );
      return slideFiles.length;
    } catch (error) {
      console.error("Error extracting PPT slide count:", error);
      return 0;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      setUploadError("File size must be less than 1GB");
      return;
    }

    setUploading(true);
    setUploadError(null);

    let videoDuration: number | undefined;
    if (fileType === "VIDEO") {
      try {
        videoDuration = await getVideoDuration(file);
        if (videoDuration && !isNaN(videoDuration)) {
          setValue("videoDuration", Math.round(videoDuration));
        }
      } catch (error) {
        console.warn("Could not extract video duration:", error);
      }
    }

    if (fileType === "PDF") {
      try {
        const pageCount = await getPdfPageCount(file);
        if (pageCount && pageCount > 0) {
          setValue("pdfPages", pageCount);
        }
      } catch (error) {
        console.warn("Could not extract PDF page count:", error);
      }
    }

    if (fileType === "PPT") {
      try {
        const slideCount = await getPptSlideCount(file);
        if (slideCount && slideCount > 0) {
          setValue("pptSlides", slideCount);
        }
      } catch (error) {
        console.warn("Could not extract PPT slide count:", error);
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
      const fullUrl = relativeUrl.startsWith('http') 
        ? relativeUrl 
        : `${window.location.origin}${relativeUrl}`;

      setUploadedFileUrl(relativeUrl);

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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  const onSubmitForm = async (data: ContentItemForm) => {
    console.log("Form submission data:", data);
    console.log("Content type:", data.type);
    console.log("PDF URL:", data.pdfUrl);
    console.log("Uploaded file URL:", uploadedFileUrl);
    
    if (data.type === "VIDEO" && !data.videoUrl) {
      alert("Video file upload is required for VIDEO type");
      return;
    }
    if (data.type === "YOUTUBE" && !data.youtubeUrl) {
      alert("YouTube URL is required for YOUTUBE type");
      return;
    }
    if (data.type === "PDF" && !data.pdfUrl) {
      alert("PDF file upload is required for PDF type. Please upload a PDF file first.");
      return;
    }
    if (data.type === "PPT" && !data.pptUrl) {
      alert("Presentation file upload is required for PPT type");
      return;
    }
    if (data.type === "EXTERNAL" && !data.externalUrl) {
      alert("External URL is required for EXTERNAL type");
      return;
    }
    
    if (data.type === "YOUTUBE" && data.youtubeUrl) {
      data.videoUrl = data.youtubeUrl;
    }

    setSaving(true);
    try {
      console.log("Submitting data:", data);
      await onSubmit(data);
      reset();
      setUploadedFileUrl(null);
      setUploadError(null);
      onClose();
    } catch (error) {
      console.error("Error saving content item:", error);
      alert(error instanceof Error ? error.message : "Failed to save content item. Please check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingItem ? "Edit Content Item" : "Add Content Item"}
    >
      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
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
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
            rows={3}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Type *</label>
          <Select
            {...register("type")}
            error={errors.type?.message}
          >
            <option value="VIDEO">Video</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="PDF">PDF</option>
            <option value="PPT">Presentation</option>
            <option value="HTML">HTML</option>
            <option value="EXTERNAL">External Link</option>
            <option value="TEST">Test</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Order *</label>
            <Input
              type="number"
              {...register("order", { valueAsNumber: true })}
              error={errors.order?.message}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <Input
              type="number"
              {...register("priority", { valueAsNumber: true })}
              error={errors.priority?.message}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register("required")}
            className="rounded border-gray-300"
          />
          <label className="text-sm">Required</label>
        </div>

        {/* Type-specific fields */}
        {contentType === "VIDEO" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Video File *</label>
            {uploadedFileUrl ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  File uploaded: {uploadedFileUrl.split('/').pop()}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRemoveFile}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove File
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleFileUploadClick}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Video"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            {uploadError && (
              <p className="mt-1 text-sm text-red-600">{uploadError}</p>
            )}
            <input type="hidden" {...register("videoUrl")} />
          </div>
        )}

        {contentType === "YOUTUBE" && (
          <div>
            <label className="mb-1 block text-sm font-medium">YouTube URL *</label>
            <Input
              {...register("youtubeUrl")}
              placeholder="https://www.youtube.com/watch?v=..."
              error={errors.youtubeUrl?.message}
            />
          </div>
        )}

        {contentType === "PDF" && (
          <div>
            <label className="mb-1 block text-sm font-medium">PDF File *</label>
            {uploadedFileUrl ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  File uploaded: {uploadedFileUrl.split('/').pop()}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRemoveFile}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove File
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleFileUploadClick}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload PDF"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            {uploadError && (
              <p className="mt-1 text-sm text-red-600">{uploadError}</p>
            )}
            <input type="hidden" {...register("pdfUrl")} />
          </div>
        )}

        {contentType === "PPT" && (
          <div>
            <label className="mb-1 block text-sm font-medium">Presentation File *</label>
            {uploadedFileUrl ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  File uploaded: {uploadedFileUrl.split('/').pop()}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRemoveFile}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove File
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleFileUploadClick}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Presentation"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={handleFileUpload}
            />
            {uploadError && (
              <p className="mt-1 text-sm text-red-600">{uploadError}</p>
            )}
            <input type="hidden" {...register("pptUrl")} />
          </div>
        )}

        {contentType === "HTML" && (
          <div>
            <label className="mb-1 block text-sm font-medium">HTML Content</label>
            <textarea
              {...register("htmlContent")}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 font-mono text-sm"
              rows={10}
            />
          </div>
        )}

        {contentType === "EXTERNAL" && (
          <div>
            <label className="mb-1 block text-sm font-medium">External URL *</label>
            <Input
              {...register("externalUrl")}
              placeholder="https://..."
              error={errors.externalUrl?.message}
            />
            <div className="mt-2">
              <label className="mb-1 block text-sm font-medium">External Type</label>
              <Input
                {...register("externalType")}
                placeholder="e.g., Article, Video, Document"
              />
            </div>
          </div>
        )}

        {(contentType === "VIDEO" || contentType === "YOUTUBE") && (
          <div>
            <label className="mb-1 block text-sm font-medium">Completion Threshold</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              {...register("completionThreshold", { valueAsNumber: true })}
              error={errors.completionThreshold?.message}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Percentage of video that must be watched (0.0 to 1.0)
            </p>
          </div>
        )}

        {contentType === "VIDEO" && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("allowSeeking")}
              className="rounded border-gray-300"
            />
            <label className="text-sm">Allow Seeking</label>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Please fix the following errors:
            </p>
            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
              {Object.entries(errors).map(([key, error]) => (
                <li key={key}>
                  {key}: {error?.message || "Invalid value"}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : existingItem ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

