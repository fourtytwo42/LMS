"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { IconButton } from "@/components/ui/icon-button";
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";

interface Enrollment {
  id: string;
  userId: string;
  courseId: string | null;
  learningPlanId: string | null;
  status: string;
  progress: number;
  enrolledAt: string;
  startedAt: string | null;
  dueDate: string | null;
  approvedAt: string | null;
  course: {
    id: string;
    title: string;
  } | null;
  learningPlan: {
    id: string;
    title: string;
  } | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function EnrollmentsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<Enrollment | null>(null);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/enrollments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch enrollments");

      const data = await response.json();
      setEnrollments(data.enrollments || []);
      setPagination({
        page: data.pagination?.page || pagination.page,
        limit: data.pagination?.limit || pagination.limit,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [pagination.page, search, statusFilter]);

  const handleApprove = async (enrollmentId: string) => {
    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}/approve`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to approve enrollment");

      fetchEnrollments();
    } catch (error) {
      console.error("Error approving enrollment:", error);
      alert("Failed to approve enrollment");
    }
  };

  const handleDelete = async () => {
    if (!enrollmentToDelete) return;

    try {
      const response = await fetch(`/api/enrollments/${enrollmentToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete enrollment");

      setDeleteModalOpen(false);
      setEnrollmentToDelete(null);
      fetchEnrollments();
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      alert("Failed to delete enrollment");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENROLLED":
        return <Badge variant="success">Enrolled</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="info">In Progress</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="warning">Pending Approval</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "DROPPED":
        return <Badge variant="danger">Dropped</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns: Record<string, Column<Enrollment>> = {
    user: {
      key: "user",
      header: "User",
      render: (enrollment) => (
        <div className="flex items-center gap-2">
          {enrollment.user.avatar ? (
            <img
              src={enrollment.user.avatar}
              alt={`${enrollment.user.firstName} ${enrollment.user.lastName}`}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300">
              {enrollment.user.firstName[0]}
              {enrollment.user.lastName[0]}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {enrollment.user.firstName} {enrollment.user.lastName}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{enrollment.user.email}</div>
          </div>
        </div>
      ),
    },
    coursePlan: {
      key: "coursePlan",
      header: "Course/Plan",
      render: (enrollment) => (
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {enrollment.course?.title || enrollment.learningPlan?.title || "-"}
        </div>
      ),
    },
    status: {
      key: "status",
      header: "Status",
      render: (enrollment) => getStatusBadge(enrollment.status),
    },
    progress: {
      key: "progress",
      header: "Progress",
      render: (enrollment) => (
        <div className="flex items-center gap-2">
          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${enrollment.progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{enrollment.progress}%</span>
        </div>
      ),
    },
    enrolledAt: {
      key: "enrolledAt",
      header: "Enrolled At",
      render: (enrollment) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(enrollment.enrolledAt).toLocaleDateString()}
        </span>
      ),
    },
    dueDate: {
      key: "dueDate",
      header: "Due Date",
      render: (enrollment) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {enrollment.dueDate ? new Date(enrollment.dueDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    actions: {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (enrollment) => (
        <div className="flex items-center justify-end gap-1">
          {enrollment.status === "PENDING_APPROVAL" && (isAdmin || isInstructor) && (
            <IconButton
              icon={<CheckCircle className="h-4 w-4" />}
              label="Approve Enrollment"
              onClick={() => handleApprove(enrollment.id)}
              variant="ghost"
              size="sm"
            />
          )}
          {(isAdmin || isInstructor) && (
            <IconButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete Enrollment"
              onClick={() => {
                setEnrollmentToDelete(enrollment);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Enrollments</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage all course and learning plan enrollments</p>
        </div>
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPagination((p) => ({ ...p, page: 1 }));
          },
          placeholder: "Search enrollments...",
        }}
        filters={[
          {
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setPagination((p) => ({ ...p, page: 1 }));
            },
            options: [
              { value: "", label: "All Status" },
              { value: "ENROLLED", label: "Enrolled" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "PENDING_APPROVAL", label: "Pending Approval" },
              { value: "COMPLETED", label: "Completed" },
              { value: "DROPPED", label: "Dropped" },
            ],
            placeholder: "All Status",
          },
        ]}
      />

      <DataTable
        data={enrollments}
        columns={columns}
        loading={loading}
        emptyMessage="No enrollments found"
        getId={(enrollment) => enrollment.id}
      />

      {pagination.totalPages > 1 && (
        <TablePagination
          pagination={pagination}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          itemName="enrollments"
        />
      )}

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEnrollmentToDelete(null);
        }}
        title="Delete Enrollment"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this enrollment? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setEnrollmentToDelete(null);
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
