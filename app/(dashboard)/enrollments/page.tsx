"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";

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
    code: string | null;
  } | null;
  learningPlan: {
    id: string;
    title: string;
    code: string | null;
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
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/enrollments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch enrollments");

      const data = await response.json();
      setEnrollments(data.enrollments);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [pagination.page, statusFilter]);

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

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Enrollments</h1>
      </div>

      <Card>
        <div className="mb-4 flex gap-4">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-48"
          >
            <option value="">All Status</option>
            <option value="ENROLLED">Enrolled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="COMPLETED">Completed</option>
            <option value="DROPPED">Dropped</option>
          </Select>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : enrollments.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">No enrollments found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Course/Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Enrolled At</TableHead>
                    <TableHead>Due Date</TableHead>
                    {(isAdmin || isInstructor) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {enrollment.course ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{enrollment.course.title}</div>
                            {enrollment.course.code && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{enrollment.course.code}</div>
                            )}
                          </div>
                        ) : enrollment.learningPlan ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{enrollment.learningPlan.title}</div>
                            {enrollment.learningPlan.code && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{enrollment.learningPlan.code}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                              style={{ width: `${enrollment.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900 dark:text-gray-100">{enrollment.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {enrollment.dueDate
                          ? new Date(enrollment.dueDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      {(isAdmin || isInstructor) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {enrollment.status === "PENDING_APPROVAL" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(enrollment.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEnrollmentToDelete(enrollment);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} enrollments
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
          setEnrollmentToDelete(null);
        }}
        title="Delete Enrollment"
      >
        <div className="space-y-4">
          <p className="text-gray-900 dark:text-gray-100">
            Are you sure you want to remove this enrollment? This action cannot be undone.
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

