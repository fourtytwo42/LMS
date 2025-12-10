"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  bio: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal("")),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

export default function ProfilePage() {
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) throw new Error("Failed to fetch profile");

        const userData = await response.json();
        setValue("firstName", userData.firstName);
        setValue("lastName", userData.lastName);
        setValue("bio", userData.bio || "");
        setValue("avatar", userData.avatar || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setValue]);

  const onSubmit = async (data: UpdateProfileForm) => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const result = await response.json();
      login(result.user);
      alert("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // In a real implementation, you would upload to a file storage service
      // For now, we'll just use a placeholder URL
      const formData = new FormData();
      formData.append("file", file);

      // TODO: Implement actual file upload endpoint
      // const response = await fetch("/api/files/upload", {
      //   method: "POST",
      //   body: formData,
      // });

      // For now, create a local object URL
      const objectUrl = URL.createObjectURL(file);
      setValue("avatar", objectUrl);
      
      alert("Avatar upload will be implemented with file storage");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!user) {
    return <div className="py-8 text-center">Please log in</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Edit Profile</h2>
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

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Profile Info</h2>
          <div className="space-y-4">
            <div className="flex justify-center">
              <Avatar
                src={user.avatar}
                name={`${user.firstName} ${user.lastName}`}
                size="lg"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Upload Avatar
              </label>
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="inline-block">
                  <Button variant="secondary" type="button">
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Choose File"}
                  </Button>
                </div>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <div className="text-sm text-gray-500">Roles</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {user.roles?.map((role) => (
                  <Badge key={role} variant="default">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

