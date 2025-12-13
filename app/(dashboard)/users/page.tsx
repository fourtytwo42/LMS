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
    </div>
  );
}

