"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  bio: z.string().optional(),
  avatar: z.string().optional(),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { user, login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
  });

  const avatar = watch("avatar");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const response = await fetch("/api/auth/me");
          if (!response.ok) throw new Error("Failed to fetch profile");

          const userData = await response.json();
          setValue("firstName", userData.firstName);
          setValue("lastName", userData.lastName);
          setValue("bio", userData.bio || "");
          setValue("avatar", userData.avatar || "");
          setAvatarPreview(userData.avatar || null);
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    } else {
      setAvatarPreview(null);
    }
  }, [isOpen, user, setValue]);

  const onSubmit = async (data: UpdateProfileForm) => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      const result = await response.json();
      login(result.user);
      alert("Profile updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "AVATAR");

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload avatar");
      }

      const result = await response.json();
      
      // Construct full URL from the relative URL
      const fullUrl = result.file.url.startsWith("http")
        ? result.file.url
        : `${window.location.origin}${result.file.url}`;
      
      // Update the avatar URL in the form
      setValue("avatar", fullUrl);
      setAvatarPreview(fullUrl);
      
      // Auto-save the profile with the new avatar URL
      const updateResponse = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio || "",
          avatar: fullUrl,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to save avatar to profile");
      }

      const updateResult = await updateResponse.json();
      
      // Update the user in the auth store
      login(updateResult.user);
      
      alert("Avatar uploaded and saved successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setValue("avatar", "");
    setAvatarPreview(null);
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile" size="lg">
      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Profile Image
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Avatar
                  src={avatarPreview || avatar || user.avatar}
                  name={`${user.firstName} ${user.lastName}`}
                  size="lg"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAvatarUploadClick}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  {(avatarPreview || avatar) && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveAvatar}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supported formats: JPG, PNG, GIF, WEBP. Max size: 5MB. Avatar will be saved automatically.
                </p>
                <input type="hidden" {...register("avatar")} />
              </div>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <Input
                {...register("firstName")}
                error={errors.firstName?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name *
              </label>
              <Input
                {...register("lastName")}
                error={errors.lastName?.message}
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <Input value={user.email} disabled className="bg-gray-50 dark:bg-gray-700" />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Email cannot be changed
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bio
            </label>
            <Textarea
              {...register("bio")}
              rows={4}
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

