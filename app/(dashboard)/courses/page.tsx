"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, BookOpen, Eye, Send, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { IconButton } from "@/components/ui/icon-button";
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";
import { Select } from "@/components/ui/select";

interface Course {
  id: string;
  title: string;
  shortDescription: string | null;
  thumbnail: string | null;
  status: string;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  publicAccess: boolean;
  selfEnrollment: boolean;
  rating: number | null;
  reviewCount: number;
  category: {
    id: string;
    name: string;
  } | null;
  enrollmentCount: number;
  contentItemCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
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
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [publishingCourseId, setPublishingCourseId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkPublishModalOpen, setBulkPublishModalOpen] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [availableLearningPlans, setAvailableLearningPlans] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedLearningPlanId, setSelectedLearningPlanId] = useState<string>("");

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/courses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch courses");

      const data = await response.json();
      setCourses(data.courses || []);
      setPagination({
        page: data.pagination?.page || pagination.page,
        limit: data.pagination?.limit || pagination.limit,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [pagination.page, search, statusFilter]);

  // Fetch learning plans for bulk assignment
  useEffect(() => {
    if (bulkAssignModalOpen) {
      const fetchLearningPlans = async () => {
        try {
          const response = await fetch("/api/learning-plans?limit=1000");
          if (response.ok) {
            const data = await response.json();
            setAvailableLearningPlans(data.learningPlans || []);
          }
        } catch (error) {
          console.error("Error fetching learning plans:", error);
        }
      };
      fetchLearningPlans();
    }
  }, [bulkAssignModalOpen]);

  const handleDelete = async () => {
    if (!courseToDelete) return;

    try {
      const response = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete course");

      setDeleteModalOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course");
    }
  };

  const handlePublish = async (courseId: string) => {
    setPublishingCourseId(courseId);
    try {
      const response = await fetch(`/api/courses/${courseId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish course");
      }

      fetchCourses();
    } catch (error) {
      console.error("Error publishing course:", error);
      alert(error instanceof Error ? error.message : "Failed to publish course");
    } finally {
      setPublishingCourseId(null);
    }
  };

  const handleArchive = async (courseId: string) => {
    if (!confirm("Are you sure you want to archive this course?")) return;

    try {
      const response = await fetch(`/api/courses/${courseId}/archive`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to archive course");

      fetchCourses();
    } catch (error) {
      console.error("Error archiving course:", error);
      alert("Failed to archive course");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCourseIds(new Set(courses.map((c) => c.id)));
    } else {
      setSelectedCourseIds(new Set());
    }
  };

  const handleSelectCourse = (courseId: string, checked: boolean) => {
    const newSelected = new Set(selectedCourseIds);
    if (checked) {
      newSelected.add(courseId);
    } else {
      newSelected.delete(courseId);
    }
    setSelectedCourseIds(newSelected);
  };

  const handleBulkPublish = async () => {
    const draftCourses = courses.filter((c) => selectedCourseIds.has(c.id) && c.status === "DRAFT");
    
    if (draftCourses.length === 0) {
      alert("No draft courses selected");
      return;
    }

    try {
      const response = await fetch("/api/courses/bulk/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: draftCourses.map((c) => c.id) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish courses");
      }

      setBulkPublishModalOpen(false);
      setSelectedCourseIds(new Set());
      fetchCourses();
      alert(`Successfully published ${draftCourses.length} course(s)`);
    } catch (error) {
      console.error("Error bulk publishing courses:", error);
      alert(error instanceof Error ? error.message : "Failed to publish courses");
    }
  };

  const handleBulkDelete = async () => {
    const courseIds = Array.from(selectedCourseIds);
    
    try {
      const response = await fetch("/api/courses/bulk/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete courses");
      }

      const result = await response.json();
      setBulkDeleteModalOpen(false);
      setSelectedCourseIds(new Set());
      fetchCourses();
      alert(`Successfully deleted ${result.deleted || courseIds.length} course(s)`);
    } catch (error) {
      console.error("Error bulk deleting courses:", error);
      alert(error instanceof Error ? error.message : "Failed to delete courses");
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedLearningPlanId) {
      alert("Please select a learning plan");
      return;
    }

    const courseIds = Array.from(selectedCourseIds);
    
    try {
      const response = await fetch(`/api/learning-plans/${selectedLearningPlanId}/courses/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign courses");
      }

      setBulkAssignModalOpen(false);
      setSelectedCourseIds(new Set());
      setSelectedLearningPlanId("");
      alert(`Successfully assigned ${courseIds.length} course(s) to learning plan`);
    } catch (error) {
      console.error("Error bulk assigning courses:", error);
      alert(error instanceof Error ? error.message : "Failed to assign courses");
    }
  };

  const selectedDraftCount = courses.filter((c) => selectedCourseIds.has(c.id) && c.status === "DRAFT").length;

  const columns: Record<string, Column<Course>> = {
    title: {
      key: "title",
      header: "Title",
      render: (course) => (
        <div className="flex items-center gap-3">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-16 h-10 object-contain rounded"
            />
          ) : (
            <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{course.title}</div>
            {course.shortDescription && (
              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {course.shortDescription}
              </div>
            )}
          </div>
        </div>
      ),
    },
    status: {
      key: "status",
      header: "Status",
      render: (course) => (
        <Badge
          variant={
            course.status === "PUBLISHED"
              ? "success"
              : course.status === "DRAFT"
              ? "warning"
              : "default"
          }
        >
          {course.status}
        </Badge>
      ),
    },
    category: {
      key: "category",
      header: "Category",
      render: (course) =>
        course.category ? (
          <Badge variant="default">{course.category.name}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    difficulty: {
      key: "difficulty",
      header: "Difficulty",
      render: (course) =>
        course.difficultyLevel ? (
          <Badge variant="info">{course.difficultyLevel}</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    enrollments: {
      key: "enrollments",
      header: "Enrollments",
      render: (course) => course.enrollmentCount,
    },
    contentItems: {
      key: "contentItems",
      header: "Content Items",
      render: (course) => course.contentItemCount,
    },
    actions: {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (course) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<Eye className="h-4 w-4" />}
            label="View Course"
            onClick={() => router.push(`/courses/${course.id}`)}
            variant="ghost"
            size="sm"
          />
          {(isAdmin || isInstructor) && (
            <>
              <IconButton
                icon={<Edit className="h-4 w-4" />}
                label="Edit Course"
                onClick={() => router.push(`/courses/${course.id}/edit`)}
                variant="ghost"
                size="sm"
              />
              {course.status === "DRAFT" && (
                <IconButton
                  icon={<Send className="h-4 w-4" />}
                  label="Publish Course"
                  onClick={() => handlePublish(course.id)}
                  variant="ghost"
                  size="sm"
                  disabled={publishingCourseId === course.id}
                />
              )}
              {course.status === "PUBLISHED" && (
                <IconButton
                  icon={<Archive className="h-4 w-4" />}
                  label="Archive Course"
                  onClick={() => handleArchive(course.id)}
                  variant="ghost"
                  size="sm"
                />
              )}
              {isAdmin && (
                <IconButton
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Delete Course"
                  onClick={() => {
                    setCourseToDelete(course);
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
      label: "Assign to Learning Plan",
      onClick: () => setBulkAssignModalOpen(true),
      variant: "secondary" as const,
      show: (isAdmin || isInstructor),
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Courses</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage and view all courses</p>
        </div>
        {(isAdmin || isInstructor) && (
          <Button onClick={() => router.push("/courses/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Course
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
          placeholder: "Search courses...",
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
                    { value: "ARCHIVED", label: "Archived" },
                  ],
                  placeholder: "All Status",
                },
              ]
            : []
        }
      />

      <DataTable
        data={courses}
        columns={columns}
        loading={loading}
        emptyMessage="No courses found"
        selectedIds={selectedCourseIds}
        onSelectAll={(isAdmin || isInstructor) ? handleSelectAll : undefined}
        onSelectItem={(isAdmin || isInstructor) ? handleSelectCourse : undefined}
        getId={(course) => course.id}
        bulkActions={bulkActions}
        bulkActionsLabel={`${selectedCourseIds.size} course(s) selected`}
      />

      {pagination.totalPages > 1 && (
        <TablePagination
          pagination={pagination}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          itemName="courses"
        />
      )}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCourseToDelete(null);
        }}
        title="Delete Course"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{courseToDelete?.title}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setCourseToDelete(null);
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
        title="Delete Courses"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete {selectedCourseIds.size} course(s)? This action cannot be undone.
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
        title="Publish Courses"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to publish {selectedDraftCount} draft course(s)?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPublish}>Publish</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkAssignModalOpen}
        onClose={() => {
          setBulkAssignModalOpen(false);
          setSelectedLearningPlanId("");
        }}
        title="Assign Courses to Learning Plan"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Assign {selectedCourseIds.size} selected course(s) to a learning plan:
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Learning Plan
            </label>
            <Select
              value={selectedLearningPlanId}
              onChange={(e) => setSelectedLearningPlanId(e.target.value)}
            >
              <option value="">Select a learning plan</option>
              {availableLearningPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkAssignModalOpen(false);
                setSelectedLearningPlanId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAssign} disabled={!selectedLearningPlanId}>
              Assign {selectedCourseIds.size} Course(s)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
