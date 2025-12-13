"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { IconButton } from "@/components/ui/icon-button";
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  order: number;
  courseCount: number;
  learningPlanCount: number;
  parent?: {
    id: string;
    name: string;
  } | null;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const isAdmin = user?.roles?.includes("ADMIN") || false;

  useEffect(() => {
    fetchCategories();
  }, [search]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");

      const data = await response.json();
      let filteredCategories = data.categories || [];
      
      if (search) {
        filteredCategories = filteredCategories.filter((category: Category) =>
          category.name.toLowerCase().includes(search.toLowerCase()) ||
          (category.description && category.description.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      // Build parent references
      const categoryMap = new Map(filteredCategories.map((cat: Category) => [cat.id, cat]));
      filteredCategories = filteredCategories.map((cat: Category) => ({
        ...cat,
        parent: cat.parentId ? categoryMap.get(cat.parentId) : null,
      }));
      
      setCategories(filteredCategories);
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

  const columns: Record<string, Column<Category>> = {
    name: {
      key: "name",
      header: "Name",
      render: (category) => (
        <div className="flex items-center gap-3">
          <Folder className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {category.parent ? (
                <span className="text-gray-400">{category.parent.name} / </span>
              ) : null}
              {category.name}
            </div>
            {category.description && (
              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {category.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    courses: {
      key: "courses",
      header: "Courses",
      render: (category) => (
        <span className="text-gray-700 dark:text-gray-300">{category.courseCount}</span>
      ),
    },
    learningPlans: {
      key: "learningPlans",
      header: "Learning Plans",
      render: (category) => (
        <span className="text-gray-700 dark:text-gray-300">{category.learningPlanCount}</span>
      ),
    },
    order: {
      key: "order",
      header: "Order",
      render: (category) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{category.order}</span>
      ),
    },
    actions: {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (category) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<Edit className="h-4 w-4" />}
            label="Edit Category"
            onClick={() => router.push(`/categories/${category.id}/edit`)}
            variant="ghost"
            size="sm"
          />
          {isAdmin && (
            <IconButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete Category"
              onClick={() => {
                setCategoryToDelete(category);
                setDeleteModalOpen(true);
              }}
              variant="ghost"
              size="sm"
            />
          )}
        </div>
      ),
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Categories</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage course and learning plan categories</p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push("/categories/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        )}
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search categories...",
        }}
      />

      <DataTable
        data={categories}
        columns={columns}
        loading={loading}
        emptyMessage="No categories found"
        getId={(category) => category.id}
      />

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        title="Delete Category"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
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
