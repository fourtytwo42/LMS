"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const createLearningPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().max(130).optional(),
  description: z.string().min(1, "Description is required"),
  estimatedTime: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined || (typeof val === "number" && isNaN(val))) {
        return undefined;
      }
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().int().positive().optional()
  ),
  difficultyLevel: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) {
        return undefined;
      }
      return val;
    },
    z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional()
  ),
  publicAccess: z.boolean().default(false),
  selfEnrollment: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  maxEnrollments: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined || (typeof val === "number" && isNaN(val))) {
        return undefined;
      }
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().int().positive().optional()
  ),
  hasCertificate: z.boolean().default(false),
  hasBadge: z.boolean().default(false),
  thumbnail: z.string().optional(),
  coverImage: z.string().optional(),
});

type CreateLearningPlanForm = z.infer<typeof createLearningPlanSchema>;

export default function NewLearningPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(createLearningPlanSchema),
    defaultValues: {
      publicAccess: false,
      selfEnrollment: false,
      requiresApproval: false,
      hasCertificate: false,
      hasBadge: false,
    },
  });

  const thumbnail = watch("thumbnail");
  const coverImage = watch("coverImage");

  const handleThumbnailUploadClick = () => {
    thumbnailInputRef.current?.click();
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "THUMBNAIL");

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload image");
      }

      const result = await response.json();
      const fullUrl = result.file.url.startsWith("http")
        ? result.file.url
        : `${window.location.origin}${result.file.url}`;
      
      setValue("thumbnail", fullUrl);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
    }
  };

  const handleCoverImageUploadClick = () => {
    coverImageInputRef.current?.click();
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "COVER");

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload image");
      }

      const result = await response.json();
      const fullUrl = result.file.url.startsWith("http")
        ? result.file.url
        : `${window.location.origin}${result.file.url}`;
      
      setValue("coverImage", fullUrl);
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
    } catch (error) {
      console.error("Error uploading cover image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingCover(false);
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveThumbnail = () => {
    setValue("thumbnail", "");
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const handleRemoveCoverImage = () => {
    setValue("coverImage", "");
    setCoverImagePreview(null);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: CreateLearningPlanForm) => {
    setSaving(true);
    try {
      // Convert empty strings to undefined for optional number fields
      const submitData = {
        ...data,
        estimatedTime: data.estimatedTime === "" || data.estimatedTime === undefined ? undefined : data.estimatedTime,
        maxEnrollments: data.maxEnrollments === "" || data.maxEnrollments === undefined ? undefined : data.maxEnrollments,
        difficultyLevel: data.difficultyLevel === "" ? undefined : data.difficultyLevel,
        thumbnail: data.thumbnail || undefined,
        coverImage: data.coverImage || undefined,
      };

      const response = await fetch("/api/learning-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create learning plan");
      }

      const result = await response.json();
      router.push(`/learning-plans/${result.learningPlan.id}`);
    } catch (error: any) {
      console.error("Error creating learning plan:", error);
      alert(error.message || "Failed to create learning plan");
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
          onClick={() => router.push("/learning-plans")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Learning Plan</h1>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Learning Plan Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input
              {...register("title")}
              error={errors.title?.message}
              placeholder="Enter learning plan title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Short Description
            </label>
            <Input
              {...register("shortDescription")}
              error={errors.shortDescription?.message}
              placeholder="Brief description (max 130 characters)"
              maxLength={130}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description *
            </label>
            <textarea
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Full learning plan description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Estimated Time (minutes)
              </label>
              <Input
                type="number"
                {...register("estimatedTime")}
                error={errors.estimatedTime?.message}
                placeholder="600 (optional)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Difficulty Level (optional)
              </label>
              <Select
                {...register("difficultyLevel")}
                error={errors.difficultyLevel?.message}
              >
                <option value="">Select difficulty (optional)</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Max Enrollments
              </label>
              <Input
                type="number"
                {...register("maxEnrollments")}
                error={errors.maxEnrollments?.message}
                placeholder="Unlimited if empty (optional)"
              />
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Thumbnail Image
            </label>
            {thumbnail || thumbnailPreview ? (
              <div className="space-y-2">
                <div className="relative w-full max-w-2xl aspect-video rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <img
                    src={thumbnailPreview || thumbnail || ""}
                    alt="Thumbnail preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    aria-label="Remove thumbnail"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleThumbnailUploadClick}
                  disabled={uploadingThumbnail}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingThumbnail ? "Uploading..." : "Change Image"}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleThumbnailUploadClick}
                disabled={uploadingThumbnail}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingThumbnail ? "Uploading..." : "Upload Thumbnail Image"}
              </Button>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailUpload}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supported formats: JPG, PNG, GIF, WEBP. Max size: 5MB
            </p>
            <input type="hidden" {...register("thumbnail")} />
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cover Image
            </label>
            {coverImage || coverImagePreview ? (
              <div className="space-y-2">
                <div className="relative w-full max-w-2xl aspect-video rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <img
                    src={coverImagePreview || coverImage || ""}
                    alt="Cover preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCoverImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    aria-label="Remove cover image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCoverImageUploadClick}
                  disabled={uploadingCover}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingCover ? "Uploading..." : "Change Image"}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCoverImageUploadClick}
                disabled={uploadingCover}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingCover ? "Uploading..." : "Upload Cover Image"}
              </Button>
            )}
            <input
              ref={coverImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverImageUpload}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supported formats: JPG, PNG, GIF, WEBP. Max size: 5MB
            </p>
            <input type="hidden" {...register("coverImage")} />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("publicAccess")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Public Access</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("selfEnrollment")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Allow Self-Enrollment</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("requiresApproval")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Requires Approval</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("hasCertificate")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Issue Certificate on Completion</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("hasBadge")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Issue Badge on Completion</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/learning-plans")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Creating..." : "Create Learning Plan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

