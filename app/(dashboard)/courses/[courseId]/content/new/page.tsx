"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const createContentItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["VIDEO", "PDF", "PPT", "HTML", "EXTERNAL", "TEST"]),
  order: z.number().int().min(0),
  priority: z.number().int().default(0),
  required: z.boolean().default(true),
  videoUrl: z.string().url().optional(),
  videoDuration: z.number().optional(),
  completionThreshold: z.number().min(0).max(1).default(0.8),
  allowSeeking: z.boolean().default(true),
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
  const courseId = params.courseId as string;
  const [saving, setSaving] = useState(false);
  const [contentType, setContentType] = useState<string>("VIDEO");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateContentItemForm>({
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
  }, [watchedType]);

  const onSubmit = async (data: CreateContentItemForm) => {
    setSaving(true);
    try {
      // Validate type-specific fields
      if (data.type === "VIDEO" && !data.videoUrl) {
        alert("Video URL is required for VIDEO type");
        setSaving(false);
        return;
      }
      if (data.type === "PDF" && !data.pdfUrl) {
        alert("PDF URL is required for PDF type");
        setSaving(false);
        return;
      }
      if (data.type === "PPT" && !data.pptUrl) {
        alert("PPT URL is required for PPT type");
        setSaving(false);
        return;
      }
      if (data.type === "EXTERNAL" && !data.externalUrl) {
        alert("External URL is required for EXTERNAL type");
        setSaving(false);
        return;
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
                <option value="VIDEO">Video</option>
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
                  Video URL *
                </label>
                <Input
                  {...register("videoUrl")}
                  error={errors.videoUrl?.message}
                  placeholder="https://example.com/video.mp4"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Duration (seconds)
                  </label>
                  <Input
                    type="number"
                    {...register("videoDuration", { valueAsNumber: true })}
                    error={errors.videoDuration?.message}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Completion Threshold
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    {...register("completionThreshold", { valueAsNumber: true })}
                    error={errors.completionThreshold?.message}
                  />
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

          {contentType === "PDF" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">PDF URL *</label>
                <Input
                  {...register("pdfUrl")}
                  error={errors.pdfUrl?.message}
                  placeholder="https://example.com/document.pdf"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Number of Pages
                </label>
                <Input
                  type="number"
                  {...register("pdfPages", { valueAsNumber: true })}
                  error={errors.pdfPages?.message}
                />
              </div>
            </>
          )}

          {contentType === "PPT" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">PPT URL *</label>
                <Input
                  {...register("pptUrl")}
                  error={errors.pptUrl?.message}
                  placeholder="https://example.com/presentation.pptx"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Number of Slides
                </label>
                <Input
                  type="number"
                  {...register("pptSlides", { valueAsNumber: true })}
                  error={errors.pptSlides?.message}
                />
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

