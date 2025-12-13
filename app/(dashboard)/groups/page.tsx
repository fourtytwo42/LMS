"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { IconButton } from "@/components/ui/icon-button";
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";

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
            onClick={() => router.push(`/groups/${group.id}/edit`)}
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
    </div>
  );
}
