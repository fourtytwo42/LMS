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
  thumbnail: z.string().url().optional().or(z.literal("")),
  coverImage: z.string().url().optional().or(z.literal("")),
});

type UpdateCourseForm = z.infer<typeof updateCourseSchema>;

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdateCourseForm>({
    resolver: zodResolver(updateCourseSchema),
  });

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
      } catch (error) {
        console.error("Error fetching course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, setValue]);

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
                {...register("estimatedTime", { valueAsNumber: true })}
                error={errors.estimatedTime?.message}
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
                <option value="">Select difficulty</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Thumbnail URL
              </label>
              <Input
                {...register("thumbnail")}
                error={errors.thumbnail?.message}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Cover Image URL
              </label>
              <Input
                {...register("coverImage")}
                error={errors.coverImage?.message}
                placeholder="https://example.com/cover.jpg"
              />
            </div>
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

