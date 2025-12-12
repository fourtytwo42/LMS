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
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">Manage your profile information and preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-5 sm:mb-6 text-lg sm:text-xl font-semibold text-gray-900">Edit Profile</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <Input
                  {...register("firstName")}
                  error={errors.firstName?.message}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <Input
                  {...register("lastName")}
                  error={errors.lastName?.message}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <Input value={user.email} disabled className="bg-gray-50" />
              <p className="mt-1.5 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                {...register("bio")}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:border-blue-500 transition-colors duration-200 resize-y"
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Avatar URL
              </label>
              <Input
                {...register("avatar")}
                error={errors.avatar?.message}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-5 sm:mb-6 text-lg sm:text-xl font-semibold text-gray-900">Profile Info</h2>
          <div className="space-y-5 sm:space-y-6">
            <div className="flex justify-center">
              <Avatar
                src={user.avatar}
                name={`${user.firstName} ${user.lastName}`}
                size="lg"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
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
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Roles</div>
              <div className="flex flex-wrap gap-2">
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

