"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Users, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils/cn";

const menuItems = {
  LEARNER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/catalog", label: "Catalog", icon: BookOpen },
    { href: "/courses", label: "My Courses", icon: BookOpen },
  ],
  INSTRUCTOR: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/catalog", label: "Catalog", icon: BookOpen },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/users", label: "Users", icon: Users },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: LayoutDashboard },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();

  if (isLoading || !user) {
    return (
      <aside className="w-64 border-r bg-gray-50">
        <nav className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </nav>
      </aside>
    );
  }

  const userRoles = user.roles;
  const isAdmin = userRoles.includes("ADMIN");
  const isInstructor = userRoles.includes("INSTRUCTOR");
  const isLearner = userRoles.includes("LEARNER");

  let items: typeof menuItems.LEARNER = [];
  if (isAdmin) {
    items = menuItems.ADMIN;
  } else if (isInstructor) {
    items = menuItems.INSTRUCTOR;
  } else if (isLearner) {
    items = menuItems.LEARNER;
  }

  return (
    <aside className="w-64 border-r bg-gray-50">
      <nav className="p-4">
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-900"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

