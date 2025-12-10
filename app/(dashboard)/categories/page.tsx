"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  order: number;
  courseCount: number;
  learningPlanCount: number;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const isAdmin = user?.roles?.includes("ADMIN") || false;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");

      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete category");
      }

      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      alert(error.message || "Failed to delete category");
    }
  };

  // Organize categories into tree structure
  const rootCategories = categories.filter((cat) => !cat.parentId);
  const childCategories = categories.filter((cat) => cat.parentId);

  const getChildren = (parentId: string) => {
    return childCategories
      .filter((cat) => cat.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categories</h1>
        {isAdmin && (
          <Button onClick={() => router.push("/categories/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        )}
      </div>

      <Card className="p-6">
        {categories.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No categories found
          </div>
        ) : (
          <div className="space-y-4">
            {rootCategories
              .sort((a, b) => a.order - b.order)
              .map((category) => (
                <div key={category.id}>
                  <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-gray-500">
                            {category.description}
                          </div>
                        )}
                        <div className="mt-1 flex gap-4 text-xs text-gray-400">
                          <span>{category.courseCount} courses</span>
                          <span>{category.learningPlanCount} learning plans</span>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/categories/${category.id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCategoryToDelete(category);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {getChildren(category.id).length > 0 && (
                    <div className="ml-8 mt-2 space-y-2 border-l-2 pl-4">
                      {getChildren(category.id).map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Folder className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">
                                {child.name}
                              </div>
                              {child.description && (
                                <div className="text-xs text-gray-500">
                                  {child.description}
                                </div>
                              )}
                              <div className="mt-1 flex gap-4 text-xs text-gray-400">
                                <span>{child.courseCount} courses</span>
                                <span>
                                  {child.learningPlanCount} learning plans
                                </span>
                              </div>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(`/categories/${child.id}/edit`)
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCategoryToDelete(child);
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        title="Delete Category"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete the category{" "}
            <strong>{categoryToDelete?.name}</strong>? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setCategoryToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

