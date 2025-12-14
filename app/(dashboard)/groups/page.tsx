"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Users, BookOpen, GraduationCap, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { IconButton } from "@/components/ui/icon-button";
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { CourseSelectionModal } from "@/components/courses/course-selection-modal";
import { LearningPlanSelectionModal } from "@/components/learning-plans/learning-plan-selection-modal";
import { UserSelectionModal } from "@/components/users/user-selection-modal";

interface Group {
  id: string;
  name: string;
  type: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

export default function GroupsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [addCoursesModalOpen, setAddCoursesModalOpen] = useState(false);
  const [addLearningPlansModalOpen, setAddLearningPlansModalOpen] = useState(false);
  const [addUsersModalOpen, setAddUsersModalOpen] = useState(false);

  const isAdmin = user?.roles?.includes("ADMIN") || false;

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/groups");
      if (!response.ok) throw new Error("Failed to fetch groups");

      const data = await response.json();
      let filteredGroups = data.groups || [];
      
      if (search) {
        filteredGroups = filteredGroups.filter((group: Group) =>
          group.name.toLowerCase().includes(search.toLowerCase()) ||
          (group.description && group.description.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      setGroups(filteredGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [search]);

  // Clear selections when page changes
  useEffect(() => {
    setSelectedGroupIds(new Set());
  }, [search]);

  const handleDelete = async () => {
    if (!groupToDelete) return;

    try {
      const response = await fetch(`/api/groups/${groupToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete group");

      setDeleteModalOpen(false);
      setGroupToDelete(null);
      fetchGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroupIds(new Set(groups.map((g) => g.id)));
    } else {
      setSelectedGroupIds(new Set());
    }
  };

  const handleSelectGroup = (groupId: string, checked: boolean) => {
    const newSelected = new Set(selectedGroupIds);
    if (checked) {
      newSelected.add(groupId);
    } else {
      newSelected.delete(groupId);
    }
    setSelectedGroupIds(newSelected);
  };

  const handleAddCourses = async (courseIds: string[]) => {
    try {
      // Add courses to all selected groups
      for (const groupId of Array.from(selectedGroupIds)) {
        const response = await fetch(`/api/groups/${groupId}/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseIds }),
        });

        if (!response.ok) {
          throw new Error(`Failed to add courses to group ${groupId}`);
        }
      }

      alert(`Successfully added ${courseIds.length} course(s) to ${selectedGroupIds.size} group(s)`);
      setSelectedGroupIds(new Set());
      setAddCoursesModalOpen(false);
    } catch (error) {
      console.error("Error adding courses to groups:", error);
      alert(error instanceof Error ? error.message : "Failed to add courses to groups");
      throw error;
    }
  };

  const handleAddLearningPlans = async (learningPlanIds: string[]) => {
    try {
      // Add learning plans to all selected groups
      for (const groupId of Array.from(selectedGroupIds)) {
        const response = await fetch(`/api/groups/${groupId}/learning-plans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ learningPlanIds }),
        });

        if (!response.ok) {
          throw new Error(`Failed to add learning plans to group ${groupId}`);
        }
      }

      alert(`Successfully added ${learningPlanIds.length} learning plan(s) to ${selectedGroupIds.size} group(s)`);
      setSelectedGroupIds(new Set());
      setAddLearningPlansModalOpen(false);
    } catch (error) {
      console.error("Error adding learning plans to groups:", error);
      alert(error instanceof Error ? error.message : "Failed to add learning plans to groups");
      throw error;
    }
  };

  const handleAddUsers = async (userIds: string[]) => {
    try {
      // Add users to all selected groups
      for (const groupId of Array.from(selectedGroupIds)) {
        for (const userId of userIds) {
          const response = await fetch(`/api/groups/${groupId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            throw new Error(`Failed to add user ${userId} to group ${groupId}`);
          }
        }
      }

      alert(`Successfully added ${userIds.length} user(s) to ${selectedGroupIds.size} group(s)`);
      setSelectedGroupIds(new Set());
      setAddUsersModalOpen(false);
    } catch (error) {
      console.error("Error adding users to groups:", error);
      alert(error instanceof Error ? error.message : "Failed to add users to groups");
      throw error;
    }
  };

  const columns: Record<string, Column<Group>> = {
    name: {
      key: "name",
      header: "Name",
      render: (group) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{group.name}</div>
          {group.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {group.description}
            </div>
          )}
        </div>
      ),
    },
    type: {
      key: "type",
      header: "Type",
      render: (group) => <Badge variant="info">{group.type}</Badge>,
    },
    members: {
      key: "members",
      header: "Members",
      render: (group) => (
        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
          <Users className="h-4 w-4" />
          {group.memberCount}
        </div>
      ),
    },
    createdAt: {
      key: "createdAt",
      header: "Created",
      render: (group) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(group.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    actions: {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (group) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={<Edit className="h-4 w-4" />}
            label="Edit Group"
            onClick={() => router.push(`/groups/${group.id}`)}
            variant="ghost"
            size="sm"
          />
          {isAdmin && (
            <IconButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete Group"
              onClick={() => {
                setGroupToDelete(group);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Groups</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage user groups</p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push("/groups/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Group
          </Button>
        )}
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search groups...",
        }}
      />

      <DataTable
        data={groups}
        columns={columns}
        loading={loading}
        emptyMessage="No groups found"
        getId={(group) => group.id}
        selectedIds={selectedGroupIds}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectGroup}
        bulkActions={[
          {
            label: "Add Courses",
            onClick: () => setAddCoursesModalOpen(true),
            variant: "primary",
            icon: <BookOpen className="h-4 w-4" />,
            show: isAdmin && selectedGroupIds.size > 0,
          },
          {
            label: "Add Learning Plans",
            onClick: () => setAddLearningPlansModalOpen(true),
            variant: "primary",
            icon: <GraduationCap className="h-4 w-4" />,
            show: isAdmin && selectedGroupIds.size > 0,
          },
          {
            label: "Add Users",
            onClick: () => setAddUsersModalOpen(true),
            variant: "primary",
            icon: <UserPlus className="h-4 w-4" />,
            show: isAdmin && selectedGroupIds.size > 0,
          },
        ]}
        bulkActionsLabel={`${selectedGroupIds.size} group(s) selected`}
      />

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setGroupToDelete(null);
        }}
        title="Delete Group"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{groupToDelete?.name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setGroupToDelete(null);
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

      <CourseSelectionModal
        isOpen={addCoursesModalOpen}
        onClose={() => setAddCoursesModalOpen(false)}
        onSelect={handleAddCourses}
        title="Add Courses to Groups"
        actionLabel="Add"
        singleSelect={false}
      />

      <LearningPlanSelectionModal
        isOpen={addLearningPlansModalOpen}
        onClose={() => setAddLearningPlansModalOpen(false)}
        onSelect={handleAddLearningPlans}
        title="Add Learning Plans to Groups"
        actionLabel="Add"
        singleSelect={false}
      />

      <UserSelectionModal
        isOpen={addUsersModalOpen}
        onClose={() => setAddUsersModalOpen(false)}
        onSelect={handleAddUsers}
        title="Add Users to Groups"
        actionLabel="Add"
        singleSelect={false}
      />
    </div>
  );
}
