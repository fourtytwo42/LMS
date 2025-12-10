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

const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

type UpdateCategoryForm = z.infer<typeof updateCategorySchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateCategoryForm>({
    resolver: zodResolver(updateCategorySchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoryResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/categories/${categoryId}`),
          fetch("/api/categories"),
        ]);

        if (!categoryResponse.ok) throw new Error("Failed to fetch category");
        if (!categoriesResponse.ok) throw new Error("Failed to fetch categories");

        const categoryData = await categoryResponse.json();
        const categoriesData = await categoriesResponse.json();

        // Filter out current category from parent options
        setCategories(
          categoriesData.categories.filter((cat: { id: string }) => cat.id !== categoryId)
        );

        reset({
          name: categoryData.name,
          description: categoryData.description || "",
          parentId: categoryData.parentId || "",
          order: categoryData.order || 0,
        });
      } catch (error) {
        console.error("Error fetching category:", error);
        alert("Failed to load category");
        router.push("/categories");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, router, reset]);

  const onSubmit = async (data: UpdateCategoryForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          parentId: data.parentId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update category");
      }

      router.push("/categories");
    } catch (error: any) {
      console.error("Error updating category:", error);
      alert(error.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  if (!user?.roles?.includes("ADMIN")) {
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
          onClick={() => router.push("/categories")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Category</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input
              {...register("name")}
              error={errors.name?.message}
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Category description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Parent Category</label>
              <Select {...register("parentId")}>
                <option value="">None (Root Category)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Order</label>
              <Input
                type="number"
                {...register("order", { valueAsNumber: true })}
                error={errors.order?.message}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/categories")}
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

