"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Award,
  Users,
  BarChart3,
  Bell,
  User,
  BookMarked,
  UserCog,
  UsersRound,
  FolderTree,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils/cn";

const menuItems = {
  LEARNER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/catalog", label: "Catalog", icon: BookOpen },
    { href: "/courses", label: "My Courses", icon: GraduationCap },
    { href: "/certificates", label: "Certificates", icon: Award },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
  ],
  INSTRUCTOR: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/enrollments", label: "Enrollments", icon: UsersRound },
    { href: "/catalog", label: "Catalog", icon: BookMarked },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/learning-plans", label: "Learning Plans", icon: BookMarked },
    { href: "/users", label: "Users", icon: UserCog },
    { href: "/groups", label: "Groups", icon: UsersRound },
    { href: "/enrollments", label: "Enrollments", icon: Users },
    { href: "/categories", label: "Categories", icon: FolderTree },
    { href: "/analytics", label: "Analytics", icon: TrendingUp },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
  ],
};

const SIDEBAR_STORAGE_KEY = "lms-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed

  // Load sidebar state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
  };

  if (isLoading || !user) {
    return (
      <aside className={cn(
        "border-r bg-gray-50 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )} aria-label="Loading navigation">
        <nav className="p-4">
          <div className="animate-pulse" aria-busy="true" aria-label="Loading menu">
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
    <aside
      className={cn(
        "border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 relative",
        isCollapsed ? "w-16" : "w-64"
      )}
      aria-label="Main navigation"
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-700",
          isCollapsed ? "rotate-180" : ""
        )}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      <nav className={cn("p-4 sm:p-5", isCollapsed && "px-2")}>
        <ul className="space-y-1.5" role="list">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.href} role="listitem">
                <Link
                  href={item.href}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 group relative",
                      isCollapsed ? "justify-center" : "gap-3",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  aria-current={isActive ? "page" : undefined}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"
                    )}
                    aria-hidden="true"
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-gray-900 dark:text-gray-800 bg-gray-100 dark:bg-gray-50 border border-gray-300 dark:border-gray-500 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                          {item.label}
                        </span>
                      )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

