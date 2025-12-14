"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Download, Upload, Edit, Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  emailVerified: boolean;
  roles: string[];
  groups: Array<{ id: string; name: string }>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkUpdateModalOpen, setBulkUpdateModalOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>("");
  const [bulkAssignCourseModalOpen, setBulkAssignCourseModalOpen] = useState(false);
  const [bulkAssignLearningPlanModalOpen, setBulkAssignLearningPlanModalOpen] = useState(false);
  const [bulkAssignGroupModalOpen, setBulkAssignGroupModalOpen] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [availableLearningPlans, setAvailableLearningPlans] = useState<Array<{ id: string; title: string }>>([]);
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLearningPlanId, setSelectedLearningPlanId] = useState<string>("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [enrollmentRole, setEnrollmentRole] = useState<"LEARNER" | "INSTRUCTOR">("LEARNER");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search, roleFilter]);

  // Clear selections when page changes
  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [pagination.page]);

  // Fetch courses, learning plans, and groups for bulk assignment
  useEffect(() => {
    if (bulkAssignCourseModalOpen || bulkAssignLearningPlanModalOpen || bulkAssignGroupModalOpen) {
      const fetchData = async () => {
        try {
          if (bulkAssignCourseModalOpen) {
            const coursesResponse = await fetch("/api/courses?limit=1000");
            if (coursesResponse.ok) {
              const coursesData = await coursesResponse.json();
              setAvailableCourses(coursesData.courses || []);
            }
          }
          if (bulkAssignLearningPlanModalOpen) {
            const plansResponse = await fetch("/api/learning-plans?limit=1000");
            if (plansResponse.ok) {
              const plansData = await plansResponse.json();
              setAvailableLearningPlans(plansData.learningPlans || []);
            }
          }
          if (bulkAssignGroupModalOpen) {
            const groupsResponse = await fetch("/api/groups?limit=1000");
            if (groupsResponse.ok) {
              const groupsData = await groupsResponse.json();
              setAvailableGroups(groupsData.groups || []);
            }
          }
        } catch (error) {
          console.error("Error fetching courses/learning plans/groups:", error);
        }
      };
      fetchData();
    }
  }, [bulkAssignCourseModalOpen, bulkAssignLearningPlanModalOpen, bulkAssignGroupModalOpen]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const isAllSelected = users.length > 0 && users.every((u) => selectedUserIds.has(u.id));
  const isSomeSelected = selectedUserIds.size > 0;

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete user");

      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/users/bulk-export?${params}`);
      if (!response.ok) throw new Error("Failed to export users");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting users:", error);
      alert("Failed to export users");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/users/bulk-import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to import users");

      const data = await response.json();
      alert(
        `Import complete: ${data.imported} imported, ${data.failed} failed`
      );
      fetchUsers();
    } catch (error) {
      console.error("Error importing users:", error);
      alert("Failed to import users");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;

    try {
      const response = await fetch("/api/users/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
        }),
      });

      if (!response.ok) throw new Error("Failed to delete users");

      const data = await response.json();
      alert(
        `Deleted ${data.deleted} user(s), ${data.failed} failed`
      );
      setBulkDeleteModalOpen(false);
      setSelectedUserIds(new Set());
      fetchUsers();
    } catch (error) {
      console.error("Error deleting users:", error);
      alert("Failed to delete users");
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedUserIds.size === 0 || !bulkRole) return;

    try {
      const response = await fetch("/api/users/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          roles: [bulkRole],
        }),
      });

      if (!response.ok) throw new Error("Failed to update users");

      const data = await response.json();
      alert(
        `Updated ${data.updated} user(s), ${data.failed} failed`
      );
      setBulkUpdateModalOpen(false);
      setBulkRole("");
      setSelectedUserIds(new Set());
      fetchUsers();
    } catch (error) {
      console.error("Error updating users:", error);
      alert("Failed to update users");
    }
  };

  const handleBulkAssignToCourse = async () => {
    if (!selectedCourseId || selectedUserIds.size === 0) return;

    try {
      const response = await fetch(`/api/courses/${selectedCourseId}/enrollments/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          role: enrollmentRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enroll users in course");
      }

      const result = await response.json();
      setBulkAssignCourseModalOpen(false);
      setSelectedCourseId("");
      setSelectedUserIds(new Set());
      fetchUsers();
      alert(`Successfully enrolled ${result.enrolled || selectedUserIds.size} user(s) in course`);
    } catch (error) {
      console.error("Error bulk enrolling users in course:", error);
      alert(error instanceof Error ? error.message : "Failed to enroll users in course");
    }
  };

  const handleBulkAssignToLearningPlan = async () => {
    if (!selectedLearningPlanId || selectedUserIds.size === 0) return;

    try {
      const response = await fetch(`/api/learning-plans/${selectedLearningPlanId}/enrollments/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          role: enrollmentRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enroll users in learning plan");
      }

      const result = await response.json();
      setBulkAssignLearningPlanModalOpen(false);
      setSelectedLearningPlanId("");
      setSelectedUserIds(new Set());
      fetchUsers();
      alert(`Successfully enrolled ${result.enrolled || selectedUserIds.size} user(s) in learning plan`);
    } catch (error) {
      console.error("Error bulk enrolling users in learning plan:", error);
      alert(error instanceof Error ? error.message : "Failed to enroll users in learning plan");
    }
  };

  const handleBulkAssignToGroups = async () => {
    if (selectedGroupIds.length === 0 || selectedUserIds.size === 0) return;

    try {
      const response = await fetch("/api/users/bulk/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          groupIds: selectedGroupIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign users to groups");
      }

      const result = await response.json();
      setBulkAssignGroupModalOpen(false);
      setSelectedGroupIds([]);
      setSelectedUserIds(new Set());
      fetchUsers();
      alert(`Successfully assigned ${result.assigned || selectedUserIds.size} user(s) to ${selectedGroupIds.length} group(s)`);
    } catch (error) {
      console.error("Error bulk assigning users to groups:", error);
      alert(error instanceof Error ? error.message : "Failed to assign users to groups");
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
        <div className="flex gap-2">
          <label htmlFor="import-file" className="cursor-pointer">
            <div className="inline-block">
              <Button variant="secondary" type="button">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </label>
          <input
            id="import-file"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="secondary" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push("/users/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New User
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex gap-4 justify-end">
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-48"
          >
            <option value="">All Roles</option>
            <option value="LEARNER">Learner</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="ADMIN">Admin</option>
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

        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">No users found</div>
        ) : (
          <>
            {isSomeSelected && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedUserIds.size} user(s) selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkAssignCourseModalOpen(true)}
                  >
                    Enroll in Course
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkAssignLearningPlanModalOpen(true)}
                  >
                    Enroll in Learning Plan
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkAssignGroupModalOpen(true)}
                  >
                    Assign to Groups
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkUpdateModalOpen(true)}
                  >
                    Change Role
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setBulkDeleteModalOpen(true)}
                  >
                    Delete Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUserIds(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 w-12">
                      <button
                        onClick={() => handleSelectAll(!isAllSelected)}
                        className="flex items-center justify-center"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Roles
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Groups
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <button
                          onClick={() => handleSelectUser(user.id, !selectedUserIds.has(user.id))}
                          className="flex items-center justify-center"
                        >
                          {selectedUserIds.has(user.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.avatar || undefined}
                            name={`${user.firstName} ${user.lastName}`}
                            size="sm"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {user.firstName} {user.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="default">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex gap-1 flex-wrap">
                          {user.groups && user.groups.length > 0 ? (
                            user.groups.map((group) => (
                              <Badge key={group.id} variant="info">
                                {group.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {user.emailVerified ? (
                          <Badge variant="success">Verified</Badge>
                        ) : (
                          <Badge variant="warning">Unverified</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/users/${user.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} users
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
          setUserToDelete(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-gray-900 dark:text-gray-100">
            Are you sure you want to delete{" "}
            <strong>
              {userToDelete?.firstName} {userToDelete?.lastName}
            </strong>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setUserToDelete(null);
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
        onClose={() => {
          setBulkDeleteModalOpen(false);
        }}
        title="Delete Selected Users"
      >
        <div className="space-y-4">
          <p className="text-gray-900 dark:text-gray-100">
            Are you sure you want to delete {selectedUserIds.size} selected user(s)? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkDeleteModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete}>
              Delete {selectedUserIds.size} User(s)
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkUpdateModalOpen}
        onClose={() => {
          setBulkUpdateModalOpen(false);
          setBulkRole("");
        }}
        title="Change Role for Selected Users"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will replace the current role(s) for {selectedUserIds.size} selected user(s) with the role below.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Role
            </label>
            <Select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              className="w-full"
            >
              <option value="">Select a role...</option>
              <option value="LEARNER">Learner</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkUpdateModalOpen(false);
                setBulkRole("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={!bulkRole}>
              Update {selectedUserIds.size} User(s)
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkAssignCourseModalOpen}
        onClose={() => {
          setBulkAssignCourseModalOpen(false);
          setSelectedCourseId("");
          setEnrollmentRole("LEARNER");
        }}
        title="Enroll Users in Course"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enroll {selectedUserIds.size} selected user(s) in a course:
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course
            </label>
            <Select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full"
            >
              <option value="">Select a course...</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <Select
              value={enrollmentRole}
              onChange={(e) => setEnrollmentRole(e.target.value as "LEARNER" | "INSTRUCTOR")}
              className="w-full"
            >
              <option value="LEARNER">Learner</option>
              <option value="INSTRUCTOR">Instructor</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkAssignCourseModalOpen(false);
                setSelectedCourseId("");
                setEnrollmentRole("LEARNER");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAssignToCourse} disabled={!selectedCourseId}>
              Enroll {selectedUserIds.size} User(s)
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkAssignLearningPlanModalOpen}
        onClose={() => {
          setBulkAssignLearningPlanModalOpen(false);
          setSelectedLearningPlanId("");
          setEnrollmentRole("LEARNER");
        }}
        title="Enroll Users in Learning Plan"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enroll {selectedUserIds.size} selected user(s) in a learning plan:
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Learning Plan
            </label>
            <Select
              value={selectedLearningPlanId}
              onChange={(e) => setSelectedLearningPlanId(e.target.value)}
              className="w-full"
            >
              <option value="">Select a learning plan...</option>
              {availableLearningPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <Select
              value={enrollmentRole}
              onChange={(e) => setEnrollmentRole(e.target.value as "LEARNER" | "INSTRUCTOR")}
              className="w-full"
            >
              <option value="LEARNER">Learner</option>
              <option value="INSTRUCTOR">Instructor</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkAssignLearningPlanModalOpen(false);
                setSelectedLearningPlanId("");
                setEnrollmentRole("LEARNER");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAssignToLearningPlan} disabled={!selectedLearningPlanId}>
              Enroll {selectedUserIds.size} User(s)
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkAssignGroupModalOpen}
        onClose={() => {
          setBulkAssignGroupModalOpen(false);
          setSelectedGroupIds([]);
        }}
        title="Assign Users to Groups"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Assign {selectedUserIds.size} selected user(s) to one or more groups:
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Groups
            </label>
            <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-2">
              {availableGroups.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No groups available</p>
              ) : (
                availableGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroupIds([...selectedGroupIds, group.id]);
                        } else {
                          setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{group.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkAssignGroupModalOpen(false);
                setSelectedGroupIds([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAssignToGroups} disabled={selectedGroupIds.length === 0}>
              Assign {selectedUserIds.size} User(s)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

