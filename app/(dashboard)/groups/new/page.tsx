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

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["STAFF", "EXTERNAL", "CUSTOM"]),
  description: z.string().optional(),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

export default function NewGroupPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      type: "CUSTOM",
    },
  });

  const onSubmit = async (data: CreateGroupForm) => {
    setSaving(true);
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create group");
      }

      const result = await response.json();
      router.push(`/groups/${result.group.id}`);
    } catch (error: any) {
      console.error("Error creating group:", error);
      alert(error.message || "Failed to create group");
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
          onClick={() => router.push("/groups")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Group</h1>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Group Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input
              {...register("name")}
              error={errors.name?.message}
              placeholder="Enter group name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Type *</label>
            <Select {...register("type")} error={errors.type?.message}>
              <option value="STAFF">Staff</option>
              <option value="EXTERNAL">External</option>
              <option value="CUSTOM">Custom</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter group description (optional)"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/groups")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

