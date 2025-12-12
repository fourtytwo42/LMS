"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <header className="border-b border-gray-200 bg-white shadow-sm" role="banner">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">
            <Link href="/dashboard" className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
              LMS
            </Link>
          </h1>
        </div>

        {user && (
          <nav className="flex items-center gap-4" aria-label="User menu">
            <NotificationCenter />
            <div className="flex items-center gap-2" aria-label={`Logged in as ${user.firstName} ${user.lastName}`}>
              <Avatar
                src={user.avatar}
                name={`${user.firstName} ${user.lastName}`}
                size="sm"
              />
              <span className="text-sm font-medium hidden sm:inline">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
              className="text-gray-700 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}

