"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["STAFF", "EXTERNAL", "CUSTOM"]),
  description: z.string().optional(),
});

type UpdateGroupForm = z.infer<typeof updateGroupSchema>;

interface Member {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  joinedAt: string;
}

interface Group {
  id: string;
  name: string;
  type: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  members: Member[];
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; email: string; firstName: string; lastName: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdateGroupForm>({
    resolver: zodResolver(updateGroupSchema),
  });

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}`);
        if (!response.ok) throw new Error("Failed to fetch group");

        const groupData = await response.json();
        setGroup(groupData);

        setValue("name", groupData.name);
        setValue("type", groupData.type);
        setValue("description", groupData.description || "");

        // Fetch all users for member selection
        const usersResponse = await fetch("/api/users?limit=1000");
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users);
        }
      } catch (error) {
        console.error("Error fetching group:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, setValue]);

  const onSubmit = async (data: UpdateGroupForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update group");

      const result = await response.json();
      setGroup((prev) => prev ? { ...prev, ...result.group } : null);
      alert("Group updated successfully");
    } catch (error) {
      console.error("Error updating group:", error);
      alert("Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (!response.ok) throw new Error("Failed to add member");

      setAddMemberModalOpen(false);
      setSelectedUserId("");
      
      // Refresh group data
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData);
      }
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove member");

      // Refresh group data
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member");
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!group) {
    return <div className="py-8 text-center">Group not found</div>;
  }

  // Filter out users who are already members
  const availableUsers = users.filter(
    (user) => !group.members.some((member) => member.userId === user.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/groups")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Group Details</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Edit Group</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <Input
                {...register("name")}
                error={errors.name?.message}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Type *</label>
              <Select {...register("type")} error={errors.type?.message}>
                <option value="STAFF">Staff</option>
                <option value="EXTERNAL">External</option>
                <option value="CUSTOM">Custom</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                {...register("description")}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/groups")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Group Info</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Type</div>
              <div className="mt-1">
                <Badge variant="info">{group.type}</Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Members</div>
              <div className="mt-1 text-sm font-medium">
                {group.memberCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="mt-1 text-sm">
                {new Date(group.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Members</h2>
          <Button
            variant="secondary"
            onClick={() => setAddMemberModalOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        {group.members.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No members in this group
          </div>
        ) : (
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatar}
                    name={`${member.firstName} ${member.lastName}`}
                    size="sm"
                  />
                  <div>
                    <div className="font-medium">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(member.userId)}
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={addMemberModalOpen}
        onClose={() => {
          setAddMemberModalOpen(false);
          setSelectedUserId("");
        }}
        title="Add Member"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Select User</label>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select a user...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAddMemberModalOpen(false);
                setSelectedUserId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId}>
              Add Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

