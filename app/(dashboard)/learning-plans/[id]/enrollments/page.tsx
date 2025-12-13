"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useAuthStore } from "@/store/auth-store";

interface Enrollment {
  id: string;
  userId: string;
  status: string;
  enrolledAt: string;
  startedAt: string | null;
  dueDate: string | null;
  progress: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
    isInstructor: boolean;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LearningPlanEnrollmentsPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
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
  const [statusFilter, setStatusFilter] = useState("");
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<Enrollment | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"LEARNER" | "INSTRUCTOR">("LEARNER");
  const [planTitle, setPlanTitle] = useState("");

  const isAdmin = user?.roles?.includes("ADMIN") || false;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch learning plan title
        const planResponse = await fetch(`/api/learning-plans/${planId}`);
        if (planResponse.ok) {
          const planData = await planResponse.json();
          setPlanTitle(planData.title);
        }

        // Fetch enrollments
        await fetchEnrollments();

        // Fetch available users for enrollment
        const usersResponse = await fetch("/api/users?limit=1000");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setAvailableUsers(usersData.users);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId]);

  const fetchEnrollments = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/learning-plans/${planId}/enrollments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch enrollments");

      const data = await response.json();
      setEnrollments(data.enrollments);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [pagination.page, search, statusFilter]);

  const handleEnroll = async () => {
    if (!selectedUserId) return;

    try {
      const response = await fetch(`/api/learning-plans/${planId}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Failed to enroll user");
        return;
      }

      setEnrollModalOpen(false);
      setSelectedUserId("");
      setSelectedRole("LEARNER");
      fetchEnrollments();
    } catch (error) {
      console.error("Error enrolling user:", error);
      alert("Failed to enroll user");
    }
  };

  const handleDelete = async () => {
    if (!enrollmentToDelete) return;

    try {
      const response = await fetch(`/api/enrollments/${enrollmentToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove enrollment");

      setDeleteModalOpen(false);
      setEnrollmentToDelete(null);
      fetchEnrollments();
    } catch (error) {
      console.error("Error removing enrollment:", error);
      alert("Failed to remove enrollment");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENROLLED":
        return <Badge variant="default">Enrolled</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="primary">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="warning">Pending Approval</Badge>;
      case "DROPPED":
        return <Badge variant="danger">Dropped</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="w-full py-8 text-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Learning Plan Enrollments
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {planTitle}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setEnrollModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll User
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex gap-4 justify-end">
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
            <option value="COMPLETED">Completed</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="DROPPED">Dropped</option>
          </Select>
          <div className="w-64">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        {enrollments.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No enrollments found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Enrolled At</TableHead>
                    <TableHead>Due Date</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {enrollment.user.avatar ? (
                            <img
                              src={enrollment.user.avatar}
                              alt={`${enrollment.user.firstName} ${enrollment.user.lastName}`}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                {enrollment.user.firstName[0]}
                                {enrollment.user.lastName[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {enrollment.user.firstName} {enrollment.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {enrollment.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {enrollment.user.isInstructor ? (
                          <Badge variant="primary">Instructor</Badge>
                        ) : (
                          <Badge variant="default">Learner</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${enrollment.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {Math.round(enrollment.progress || 0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {enrollment.dueDate
                          ? new Date(enrollment.dueDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setEnrollmentToDelete(enrollment);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination.totalPages > 1 && (
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
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page + 1 }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        isOpen={enrollModalOpen}
        onClose={() => {
          setEnrollModalOpen(false);
          setSelectedUserId("");
          setSelectedRole("LEARNER");
        }}
        title="Enroll User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User
            </label>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full"
            >
              <option value="">Select a user...</option>
              {availableUsers
                .filter(
                  (u) => !enrollments.some((e) => e.userId === u.id)
                )
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <Select
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value as "LEARNER" | "INSTRUCTOR")
              }
              className="w-full"
            >
              <option value="LEARNER">Learner</option>
              <option value="INSTRUCTOR">Instructor</option>
            </Select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Instructors will have admin access to all courses in this learning plan
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setEnrollModalOpen(false);
                setSelectedUserId("");
                setSelectedRole("LEARNER");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEnroll} disabled={!selectedUserId}>
              Enroll
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEnrollmentToDelete(null);
        }}
        title="Remove Enrollment"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to remove{" "}
            {enrollmentToDelete
              ? `${enrollmentToDelete.user.firstName} ${enrollmentToDelete.user.lastName}`
              : "this user"}{" "}
            from this learning plan? This will revoke their access to all courses in the plan.
          </p>
          <div className="flex justify-end gap-2 pt-4">
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
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

