"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const createCourseSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().max(130).optional(),
  description: z.string().optional(),
  type: z.enum(["E-LEARNING", "BLENDED", "IN_PERSON"]).default("E-LEARNING"),
  categoryId: z.string().optional(),
  estimatedTime: z.number().int().positive().optional(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  publicAccess: z.boolean().default(false),
  selfEnrollment: z.boolean().default(false),
  sequentialRequired: z.boolean().default(true),
  allowSkipping: z.boolean().default(false),
});

type CreateCourseForm = z.infer<typeof createCourseSchema>;


export default function NewCoursePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      type: "E-LEARNING",
      publicAccess: false,
      selfEnrollment: false,
      sequentialRequired: true,
      allowSkipping: false,
    },
  });

  useEffect(() => {
    // TODO: Fetch categories from API when category endpoint is ready
    // For now, using empty array
  }, []);

  const onSubmit = async (data: CreateCourseForm) => {
    setSaving(true);
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create course");
      }

      const result = await response.json();
      router.push(`/courses/${result.course.id}`);
    } catch (error: any) {
      console.error("Error creating course:", error);
      alert(error.message || "Failed to create course");
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
          onClick={() => router.push("/courses")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Course</h1>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Course Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <Input
                {...register("code")}
                error={errors.code?.message}
                placeholder="COURSE-001 (optional)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type *</label>
              <Select {...register("type")} error={errors.type?.message}>
                <option value="E-LEARNING">E-Learning</option>
                <option value="BLENDED">Blended</option>
                <option value="IN_PERSON">In-Person</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <Input
              {...register("title")}
              error={errors.title?.message}
              placeholder="Enter course title"
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
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Full course description"
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
                placeholder="120"
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
              onClick={() => router.push("/courses")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Creating..." : "Create Course"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

