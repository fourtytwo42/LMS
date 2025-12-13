"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";

interface LearningPlan {
  id: string;
  code: string | null;
  title: string;
  shortDescription: string | null;
  thumbnail: string | null;
  status: string;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  publicAccess: boolean;
  selfEnrollment: boolean;
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
      setPlans(data.learningPlans);
      setPagination(data.pagination);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Learning Plans</h1>
        {(isAdmin || isInstructor) && (
          <Button onClick={() => router.push("/learning-plans/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Learning Plan
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex gap-4 justify-end">
          {(isAdmin || isInstructor) && (
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-40"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          )}
          <div className="w-64">
            <Input
              placeholder="Search learning plans..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No learning plans found
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="mb-3">
                    {plan.coverImage ? (
                      <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        <img
                          src={plan.coverImage}
                          alt={plan.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <h3 className="text-lg font-semibold mb-1">{plan.title}</h3>
                    {plan.code && (
                      <p className="text-sm text-gray-500 mb-2">{plan.code}</p>
                    )}
                    {plan.shortDescription && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {plan.shortDescription}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
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
                    {plan.difficultyLevel && (
                      <Badge variant="info">{plan.difficultyLevel}</Badge>
                    )}
                    {plan.category && (
                      <Badge variant="default">{plan.category.name}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{plan.enrollmentCount} enrollments</span>
                    <span>{plan.courseCount} courses</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/learning-plans/${plan.id}`)}
                    >
                      View
                    </Button>
                    {(isAdmin || isInstructor) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/learning-plans/${plan.id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPlanToDelete(plan);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} learning plans
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPlanToDelete(null);
        }}
        title="Delete Learning Plan"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete the learning plan{" "}
            <strong>{planToDelete?.title}</strong>? This action cannot be
            undone.
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
    </div>
  );
}

