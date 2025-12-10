"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const createUserSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    roles: z.array(z.enum(["LEARNER", "INSTRUCTOR", "ADMIN"])).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      roles: ["LEARNER"],
    },
  });

  const onSubmit = async (data: CreateUserForm) => {
    setSaving(true);
    try {
      const { confirmPassword, ...userData } = data;
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }

      const result = await response.json();
      router.push(`/users/${result.user.id}`);
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(error.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-bold">Create New User</h1>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">User Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                First Name *
              </label>
              <Input
                {...register("firstName")}
                error={errors.firstName?.message}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Last Name *
              </label>
              <Input
                {...register("lastName")}
                error={errors.lastName?.message}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email *</label>
            <Input
              type="email"
              {...register("email")}
              error={errors.email?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Password *
              </label>
              <Input
                type="password"
                {...register("password")}
                error={errors.password?.message}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Confirm Password *
              </label>
              <Input
                type="password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Roles</label>
            <div className="space-y-2">
              {["LEARNER", "INSTRUCTOR", "ADMIN"].map((role) => (
                <label key={role} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={role}
                    {...register("roles")}
                    defaultChecked={role === "LEARNER"}
                    className="rounded border-gray-300"
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
          </div>

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
              {saving ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

