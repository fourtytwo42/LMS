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
import { useAuthStore } from "@/store/auth-store";

const updateLearningPlanSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().max(130).optional(),
  description: z.string().min(1, "Description is required"),
  estimatedTime: z.number().int().positive().optional().nullable(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable(),
  publicAccess: z.boolean().default(false),
  selfEnrollment: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  maxEnrollments: z.number().int().positive().optional().nullable(),
  hasCertificate: z.boolean().default(false),
  hasBadge: z.boolean().default(false),
  thumbnail: z.string().url().optional().or(z.literal("")),
  coverImage: z.string().url().optional().or(z.literal("")),
});

type UpdateLearningPlanForm = z.infer<typeof updateLearningPlanSchema>;

export default function EditLearningPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(updateLearningPlanSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [planResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/learning-plans/${planId}`),
          fetch("/api/categories"),
        ]);

        if (!planResponse.ok) throw new Error("Failed to fetch learning plan");
        if (!categoriesResponse.ok) throw new Error("Failed to fetch categories");

        const planData = await planResponse.json();
        const categoriesData = await categoriesResponse.json();

        setCategories(categoriesData.categories);

        reset({
          code: planData.code || "",
          title: planData.title,
          shortDescription: planData.shortDescription || "",
          description: planData.description || "",
          estimatedTime: planData.estimatedTime,
          difficultyLevel: planData.difficultyLevel,
          publicAccess: planData.publicAccess,
          selfEnrollment: planData.selfEnrollment,
          requiresApproval: planData.requiresApproval,
          maxEnrollments: planData.maxEnrollments,
          hasCertificate: planData.hasCertificate,
          hasBadge: planData.hasBadge,
          thumbnail: planData.thumbnail || "",
          coverImage: planData.coverImage || "",
        });
      } catch (error) {
        console.error("Error fetching learning plan:", error);
        alert("Failed to load learning plan");
        router.push("/learning-plans");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId, router, reset]);

  const onSubmit = async (data: UpdateLearningPlanForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/learning-plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          estimatedTime: data.estimatedTime || null,
          difficultyLevel: data.difficultyLevel || null,
          maxEnrollments: data.maxEnrollments || null,
          thumbnail: data.thumbnail || null,
          coverImage: data.coverImage || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update learning plan");
      }

      router.push(`/learning-plans/${planId}`);
    } catch (error: any) {
      console.error("Error updating learning plan:", error);
      alert(error.message || "Failed to update learning plan");
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;

  if (!isAdmin && !isInstructor) {
    router.replace("/dashboard");
    return null;
  }

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/learning-plans/${planId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Learning Plan</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Code</label>
            <Input
              {...register("code")}
              error={errors.code?.message}
              placeholder="LP-001 (optional)"
            />
          </div>

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
                {...register("estimatedTime", { valueAsNumber: true })}
                error={errors.estimatedTime?.message}
                placeholder="600"
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

          <div>
            <label className="mb-1 block text-sm font-medium">
              Max Enrollments
            </label>
            <Input
              type="number"
              {...register("maxEnrollments", { valueAsNumber: true })}
              error={errors.maxEnrollments?.message}
              placeholder="Unlimited if empty"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Thumbnail URL</label>
            <Input
              {...register("thumbnail")}
              error={errors.thumbnail?.message}
              placeholder="https://example.com/thumbnail.jpg"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Cover Image URL</label>
            <Input
              {...register("coverImage")}
              error={errors.coverImage?.message}
              placeholder="https://example.com/cover.jpg"
            />
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
              onClick={() => router.push(`/learning-plans/${planId}`)}
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

