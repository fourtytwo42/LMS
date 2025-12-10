"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const createLearningPlanSchema = z.object({
  code: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().max(130).optional(),
  description: z.string().min(1, "Description is required"),
  estimatedTime: z.number().int().positive().optional(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  publicAccess: z.boolean().default(false),
  selfEnrollment: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  maxEnrollments: z.number().int().positive().optional(),
  hasCertificate: z.boolean().default(false),
  hasBadge: z.boolean().default(false),
});

type CreateLearningPlanForm = z.infer<typeof createLearningPlanSchema>;

export default function NewLearningPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLearningPlanForm>({
    resolver: zodResolver(createLearningPlanSchema),
    defaultValues: {
      publicAccess: false,
      selfEnrollment: false,
      requiresApproval: false,
      hasCertificate: false,
      hasBadge: false,
    },
  });

  const onSubmit = async (data: CreateLearningPlanForm) => {
    setSaving(true);
    try {
      const response = await fetch("/api/learning-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

          <div className="grid grid-cols-2 gap-4">
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

