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

const updateCourseSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().max(130).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  estimatedTime: z.number().int().positive().optional().nullable(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable(),
  publicAccess: z.boolean().optional(),
  selfEnrollment: z.boolean().optional(),
  sequentialRequired: z.boolean().optional(),
  allowSkipping: z.boolean().optional(),
  thumbnail: z.string().optional(),
  coverImage: z.string().optional(),
});

type UpdateCourseForm = z.infer<typeof updateCourseSchema>;

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateCourseForm>({
    resolver: zodResolver(updateCourseSchema),
  });

  const coverImage = watch("coverImage");
  const thumbnail = watch("thumbnail");

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        if (!response.ok) throw new Error("Failed to fetch course");

        const courseData = await response.json();
        setCourse(courseData);

        setValue("code", courseData.code || "");
        setValue("title", courseData.title);
        setValue("shortDescription", courseData.shortDescription || "");
        setValue("description", courseData.description || "");
        setValue("categoryId", courseData.category?.id || "");
        setValue("estimatedTime", courseData.estimatedTime);
        setValue("difficultyLevel", courseData.difficultyLevel);
        setValue("publicAccess", courseData.publicAccess);
        setValue("selfEnrollment", courseData.selfEnrollment);
        setValue("sequentialRequired", courseData.sequentialRequired);
        setValue("allowSkipping", courseData.allowSkipping);
        setValue("thumbnail", courseData.thumbnail || "");
        setValue("coverImage", courseData.coverImage || "");
        
        // Set previews if images exist
        if (courseData.coverImage) {
          setCoverImagePreview(courseData.coverImage);
        }
        if (courseData.thumbnail) {
          setThumbnailPreview(courseData.thumbnail);
        }
      } catch (error) {
        console.error("Error fetching course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, setValue]);

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

  const handleRemoveCoverImage = () => {
    setValue("coverImage", "");
    setCoverImagePreview(null);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = "";
    }
  };

  const handleRemoveThumbnail = () => {
    setValue("thumbnail", "");
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: UpdateCourseForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          estimatedTime: data.estimatedTime || null,
          difficultyLevel: data.difficultyLevel || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update course");

      alert("Course updated successfully");
      router.push(`/courses/${courseId}`);
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!course) {
    return <div className="py-8 text-center">Course not found</div>;
  }

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
        <h1 className="text-3xl font-bold">Edit Course</h1>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Course Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Code</label>
            <Input
              {...register("code")}
              error={errors.code?.message}
              placeholder="COURSE-001 (optional)"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input
              {...register("title")}
              error={errors.title?.message}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Short Description
            </label>
            <Input
              {...register("shortDescription")}
              error={errors.shortDescription?.message}
              maxLength={130}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Estimated Time (minutes)
              </label>
              <Input
                type="number"
                {...register("estimatedTime", { 
                  valueAsNumber: true,
                  setValueAs: (v) => v === "" ? undefined : Number(v)
                })}
                error={errors.estimatedTime?.message}
                placeholder="120 (optional)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Difficulty Level
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

          {/* Cover Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cover Image
            </label>
            {coverImage || coverImagePreview ? (
              <div className="space-y-2">
                <div className="relative w-full h-48 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={coverImagePreview || coverImage || ""}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
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

          {/* Thumbnail Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Thumbnail Image
            </label>
            {thumbnail || thumbnailPreview ? (
              <div className="space-y-2">
                <div className="relative w-32 h-32 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={thumbnailPreview || thumbnail || ""}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    aria-label="Remove thumbnail"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleThumbnailUploadClick}
                  disabled={uploadingThumbnail}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingThumbnail ? "Uploading..." : "Change Thumbnail"}
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
                {uploadingThumbnail ? "Uploading..." : "Upload Thumbnail"}
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
                {...register("sequentialRequired")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Sequential Content Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register("allowSkipping")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Allow Skipping Content</span>
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
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

