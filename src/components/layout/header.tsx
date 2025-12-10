"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    router.push("/login");
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">LMS</h1>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="flex items-center gap-2">
              <Avatar
                src={user.avatar}
                name={`${user.firstName} ${user.lastName}`}
                size="sm"
              />
              <span className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

