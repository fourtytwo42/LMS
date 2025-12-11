"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  bio: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  roles: z.array(z.enum(["LEARNER", "INSTRUCTOR", "ADMIN"])).optional(),
});

type UpdateUserForm = z.infer<typeof updateUserSchema>;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
  enrollments: Array<{
    id: string;
    courseId: string;
    courseTitle: string;
    status: string;
    enrolledAt: string;
  }>;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch user");

        const userData = await response.json();
        setUser(userData);

        // Check if current user is admin
        const meResponse = await fetch("/api/auth/me");
        if (meResponse.ok) {
          const me = await meResponse.json();
          setIsAdmin(me.roles?.includes("ADMIN") || false);
        }

        // Set form values
        setValue("firstName", userData.firstName);
        setValue("lastName", userData.lastName);
        setValue("bio", userData.bio || "");
        setValue("avatar", userData.avatar || "");
        if (isAdmin) {
          setValue("roles", userData.roles);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, setValue, isAdmin]);

  const onSubmit = async (data: UpdateUserForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update user");

      const updatedUser = await response.json();
      setUser(updatedUser.user);
      alert("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!user) {
    return <div className="py-8 text-center">User not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/users")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">User Details</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Edit User</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  First Name
                </label>
                <Input
                  {...register("firstName")}
                  error={errors.firstName?.message}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Last Name
                </label>
                <Input
                  {...register("lastName")}
                  error={errors.lastName?.message}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input value={user.email} disabled />
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Bio</label>
              <textarea
                {...register("bio")}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Avatar URL
              </label>
              <Input
                {...register("avatar")}
                error={errors.avatar?.message}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium">Roles</label>
                <div className="space-y-2">
                  {["LEARNER", "INSTRUCTOR", "ADMIN"].map((role) => (
                    <label key={role} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value={role}
                        {...register("roles")}
                        className="rounded border-gray-300"
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/users")}
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
          <h2 className="mb-4 text-xl font-semibold">User Info</h2>
          <div className="space-y-4">
            <div className="flex justify-center">
              <Avatar
                    src={user.avatar || undefined}
                name={`${user.firstName} ${user.lastName}`}
                size="lg"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="mt-1">
                {user.emailVerified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="warning">Unverified</Badge>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Roles</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <Badge key={role} variant="default">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="mt-1 text-sm">
                {new Date(user.createdAt).toLocaleString()}
              </div>
            </div>
            {user.lastLoginAt && (
              <div>
                <div className="text-sm text-gray-500">Last Login</div>
                <div className="mt-1 text-sm">
                  {new Date(user.lastLoginAt).toLocaleString()}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500">Enrollments</div>
              <div className="mt-1 text-sm font-medium">
                {user.enrollments.length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {user.enrollments.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Enrollments</h2>
          <div className="space-y-2">
            {user.enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="font-medium">{enrollment.courseTitle}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="info">{enrollment.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

