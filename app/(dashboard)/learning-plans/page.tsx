"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, BookOpen, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { IconButton } from "@/components/ui/icon-button";
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";

interface LearningPlan {
  id: string;
  title: string;
  shortDescription: string | null;
  coverImage: string | null;
  status: string;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  courseCount: number;
  enrollmentCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LearningPlansPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<LearningPlan | null>(null);
  const [publishingPlanId, setPublishingPlanId] = useState<string | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkPublishModalOpen, setBulkPublishModalOpen] = useState(false);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/learning-plans?${params}`);
      if (!response.ok) throw new Error("Failed to fetch learning plans");

      const data = await response.json();
      setPlans(data.learningPlans || []);
      setPagination({
        page: data.pagination?.page || pagination.page,
        limit: data.pagination?.limit || pagination.limit,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (error) {
      console.error("Error fetching learning plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [pagination.page, search, statusFilter]);

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      const response = await fetch(`/api/learning-plans/${planToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete learning plan");

      setDeleteModalOpen(false);
      setPlanToDelete(null);
      fetchPlans();
    } catch (error) {
      console.error("Error deleting learning plan:", error);
      alert("Failed to delete learning plan");
    }
  };

  const handlePublish = async (planId: string) => {
    if (!confirm("Are you sure you want to publish this learning plan? Enrolled users will be able to access the content.")) return;

    setPublishingPlanId(planId);
    try {
      const response = await fetch(`/api/learning-plans/${planId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish learning plan");
      }

      fetchPlans();
    } catch (error) {
      console.error("Error publishing learning plan:", error);
      alert(error instanceof Error ? error.message : "Failed to publish learning plan");
    } finally {
      setPublishingPlanId(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlanIds(new Set(plans.map((p) => p.id)));
    } else {
      setSelectedPlanIds(new Set());
    }
  };

  const handleSelectPlan = (planId: string, checked: boolean) => {
    const newSelected = new Set(selectedPlanIds);
    if (checked) {
      newSelected.add(planId);
    } else {
      newSelected.delete(planId);
    }
    setSelectedPlanIds(newSelected);
  };

  const handleBulkPublish = async () => {
    const draftPlans = plans.filter((p) => selectedPlanIds.has(p.id) && p.status === "DRAFT");
    
    if (draftPlans.length === 0) {
      alert("No draft learning plans selected");
      return;
    }

    try {
      const response = await fetch("/api/learning-plans/bulk/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planIds: draftPlans.map((p) => p.id) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish learning plans");
      }

      const result = await response.json();
      setBulkPublishModalOpen(false);
      setSelectedPlanIds(new Set());
      fetchPlans();
      alert(`Successfully published ${result.published || draftPlans.length} learning plan(s)${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
    } catch (error) {
      console.error("Error bulk publishing learning plans:", error);
      alert(error instanceof Error ? error.message : "Failed to publish learning plans");
    }
  };

  const handleBulkDelete = async () => {
    const planIds = Array.from(selectedPlanIds);
    
    try {
      const response = await fetch("/api/learning-plans/bulk/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningPlanIds: planIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete learning plans");
      }

      const result = await response.json();
      setBulkDeleteModalOpen(false);
      setSelectedPlanIds(new Set());
      fetchPlans();
      alert(`Successfully deleted ${result.deleted || planIds.length} learning plan(s)`);
    } catch (error) {
      console.error("Error bulk deleting learning plans:", error);
      alert(error instanceof Error ? error.message : "Failed to delete learning plans");
    }
  };

  const selectedDraftCount = plans.filter((p) => selectedPlanIds.has(p.id) && p.status === "DRAFT").length;

  const columns: Record<string, Column<LearningPlan>> = {
    title: {
      key: "title",
      header: "Title",
      render: (plan) => (
        <div className="flex items-center gap-3">
          {plan.coverImage ? (
            <img
              src={plan.coverImage}
              alt={plan.title}
              className="w-16 h-10 object-contain rounded"
            />
          ) : (
            <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{plan.title}</div>
            {plan.shortDescription && (
              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {plan.shortDescription}
              </div>
            )}
          </div>
        </div>
      ),
    },
    status: {
      key: "status",
      header: "Status",
      render: (plan) => (
        <Badge
          variant={
            plan.status === "PUBLISHED"
              ? "success"
              : plan.status === "DRAFT"
              ? "warning"
              : "default"
          }
        >
          {plan.status}
        </Badge>
      ),
    },
    category: {
      key: "category",
      header: "Category",
      render: (plan) =>
        plan.category ? (
          <Badge variant="default">{plan.category.name}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    difficulty: {
      key: "difficulty",
      header: "Difficulty",
      render: (plan) =>
        plan.difficultyLevel ? (
          <Badge variant="info">{plan.difficultyLevel}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    enrollments: {
      key: "enrollments",
      header: "Enrollments",
      render: (plan) => plan.enrollmentCount,
    },
    courses: {
      key: "courses",
      header: "Courses",
      render: (plan) => plan.courseCount,
    },
    actions: {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (plan) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<Eye className="h-4 w-4" />}
            label="View Learning Plan"
            onClick={() => router.push(`/learning-plans/${plan.id}`)}
            variant="ghost"
            size="sm"
          />
          {(isAdmin || isInstructor) && (
            <>
              {plan.status === "DRAFT" && (
                <IconButton
                  icon={<Send className="h-4 w-4" />}
                  label="Publish Learning Plan"
                  onClick={() => handlePublish(plan.id)}
                  variant="ghost"
                  size="sm"
                  disabled={publishingPlanId === plan.id}
                />
              )}
              {isAdmin && (
                <IconButton
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Delete Learning Plan"
                  onClick={() => {
                    setPlanToDelete(plan);
                    setDeleteModalOpen(true);
                  }}
                  variant="ghost"
                  size="sm"
                />
              )}
            </>
          )}
        </div>
      ),
    },
  };

  const bulkActions = [
    {
      label: `Publish (${selectedDraftCount})`,
      onClick: () => setBulkPublishModalOpen(true),
      variant: "primary" as const,
      icon: <Send className="h-4 w-4" />,
      show: selectedDraftCount > 0 && (isAdmin || isInstructor),
    },
    {
      label: "Delete",
      onClick: () => setBulkDeleteModalOpen(true),
      variant: "danger" as const,
      icon: <Trash2 className="h-4 w-4" />,
      show: isAdmin,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Learning Plans</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage and view all learning plans</p>
        </div>
        {(isAdmin || isInstructor) && (
          <Button onClick={() => router.push("/learning-plans/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Learning Plan
          </Button>
        )}
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPagination((p) => ({ ...p, page: 1 }));
          },
          placeholder: "Search learning plans...",
        }}
        filters={
          (isAdmin || isInstructor)
            ? [
                {
                  value: statusFilter,
                  onChange: (value) => {
                    setStatusFilter(value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  },
                  options: [
                    { value: "", label: "All Status" },
                    { value: "DRAFT", label: "Draft" },
                    { value: "PUBLISHED", label: "Published" },
                  ],
                  placeholder: "All Status",
                },
              ]
            : []
        }
      />

      <DataTable
        data={plans}
        columns={columns}
        loading={loading}
        emptyMessage="No learning plans found"
        selectedIds={selectedPlanIds}
        onSelectAll={(isAdmin || isInstructor) ? handleSelectAll : undefined}
        onSelectItem={(isAdmin || isInstructor) ? handleSelectPlan : undefined}
        getId={(plan) => plan.id}
        bulkActions={bulkActions}
        bulkActionsLabel={`${selectedPlanIds.size} learning plan(s) selected`}
      />

      {pagination.totalPages > 1 && (
        <TablePagination
          pagination={pagination}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          itemName="learning plans"
        />
      )}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPlanToDelete(null);
        }}
        title="Delete Learning Plan"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{planToDelete?.title}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setPlanToDelete(null);
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

      <Modal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        title="Delete Learning Plans"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete {selectedPlanIds.size} learning plan(s)? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkPublishModalOpen}
        onClose={() => setBulkPublishModalOpen(false)}
        title="Publish Learning Plans"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to publish {selectedDraftCount} draft learning plan(s)?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPublish}>Publish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
