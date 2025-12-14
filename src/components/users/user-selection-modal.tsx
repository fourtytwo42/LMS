"use client";

import { useState, useEffect } from "react";
import { UserPlus, CheckSquare, Square } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { CheckSquare as CheckSquareIcon, Square as SquareIcon, ArrowUp, ArrowDown } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  roles: string[];
}

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userIds: string[], role?: "LEARNER" | "INSTRUCTOR") => Promise<void>;
  title: string;
  actionLabel?: string;
  excludeUserIds?: Set<string>; // Users to exclude from the list (e.g., already enrolled)
  showRoleSelection?: boolean; // Show role selector (for enrollments)
  defaultRole?: "LEARNER" | "INSTRUCTOR";
  singleSelect?: boolean; // If true, only one user can be selected
}

export function UserSelectionModal({
  isOpen,
  onClose,
  onSelect,
  title,
  actionLabel = "Select",
  excludeUserIds = new Set(),
  showRoleSelection = false,
  defaultRole = "LEARNER",
  singleSelect = false,
}: UserSelectionModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<"LEARNER" | "INSTRUCTOR">(defaultRole);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearch("");
      setSelectedUserIds(new Set());
      setSelectedRole(defaultRole);
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      setSortBy("name");
      setSortOrder("asc");
    }
  }, [isOpen, defaultRole]);

  // Fetch users when search, page, or sort changes
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [search, pagination.page, sortBy, sortOrder, isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      
      // Filter out excluded users
      const filteredUsers = (data.users || []).filter(
        (user: User) => !excludeUserIds.has(user.id)
      );

      // Sort users
      const sortedUsers = [...filteredUsers].sort((a, b) => {
        let aVal: string;
        let bVal: string;
        
        if (sortBy === "name") {
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else {
          aVal = "";
          bVal = "";
        }
        
        if (sortOrder === "asc") {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });

      setUsers(sortedUsers);
      setPagination({
        ...pagination,
        total: data.pagination?.total || filteredUsers.length,
        totalPages: data.pagination?.totalPages || 1,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    if (singleSelect) {
      setSelectedUserIds(new Set([userId]));
    } else {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedUserIds.size === 0) return;

    setSubmitting(true);
    try {
      await onSelect(
        Array.from(selectedUserIds),
        showRoleSelection ? selectedRole : undefined
      );
      setSelectedUserIds(new Set());
      onClose();
    } catch (error) {
      console.error("Error in user selection:", error);
      throw error; // Re-throw so parent can handle
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
    >
      {label}
      {sortBy === column && (
        <span className="text-xs">
          {sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        </span>
      )}
    </button>
  );

  const isAllSelected = users.length > 0 && selectedUserIds.size === users.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {showRoleSelection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enrollment Role
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
          </div>
        )}

        <TableToolbar
          search={{
            value: search,
            onChange: (value) => {
              setSearch(value);
              setPagination((p) => ({ ...p, page: 1 }));
            },
            placeholder: "Search users...",
          }}
        />

        {selectedUserIds.size > 0 && !singleSelect && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedUserIds.size} user(s) selected
            </div>
            <Button onClick={handleSubmit} variant="primary" disabled={submitting}>
              <UserPlus className="mr-2 h-4 w-4" />
              {actionLabel} Selected
            </Button>
          </div>
        )}

        <div className="max-h-96 overflow-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">No users available</div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!singleSelect && (
                        <TableHead className="w-12">
                          <button
                            onClick={handleSelectAll}
                            className="flex items-center justify-center"
                          >
                            {isAllSelected ? (
                              <CheckSquareIcon className="h-5 w-5 text-blue-600" />
                            ) : (
                              <SquareIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </TableHead>
                      )}
                      <TableHead>
                        <SortableHeader column="name" label="Name" />
                      </TableHead>
                      <TableHead>Roles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        {!singleSelect && (
                          <TableCell>
                            <button
                              onClick={() => handleSelectUser(user.id)}
                              className="flex items-center justify-center"
                            >
                              {selectedUserIds.has(user.id) ? (
                                <CheckSquareIcon className="h-5 w-5 text-blue-600" />
                              ) : (
                                <SquareIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="default" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <TablePagination
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            itemName="users"
          />
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedUserIds.size === 0 || submitting}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {actionLabel}{" "}
            {selectedUserIds.size > 0
              ? `${selectedUserIds.size} `
              : ""}
            User{selectedUserIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

