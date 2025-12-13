"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  Menu,
  MenuItem,
} from "react-pro-sidebar";
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
  Menu as MenuIcon,
  ChevronLeft,
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

interface SidebarContentProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarContent({ collapsed, onToggle }: SidebarContentProps) {
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();

  // Update CSS variable for main content margin
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-width", collapsed ? "80px" : "250px");
  }, [collapsed]);

  if (isLoading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-2">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        </div>
      </div>
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
    <div className="flex flex-col h-full">
      {/* Header with Toggle */}
      <div className={cn(
        "flex items-center p-4 border-b border-gray-200 dark:border-gray-700",
        collapsed ? "justify-center" : "justify-end"
      )}>
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center rounded-lg p-2",
            "text-gray-700 dark:text-gray-300",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "transition-colors duration-200",
            "focus:outline-none",
            collapsed && "w-full"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <MenuIcon className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <Menu
          menuItemStyles={{
            button: {
              [`&.ps-active`]: {
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#2563eb",
              },
              [`&:hover`]: {
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
            },
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <MenuItem
                key={item.href}
                icon={<Icon className="h-5 w-5" />}
                active={isActive}
                component={<Link href={item.href} />}
              >
                {item.label}
              </MenuItem>
            );
          })}
        </Menu>
      </div>
    </div>
  );
}

export function SidebarComponent() {
  // Read from localStorage synchronously on client side, default to true (collapsed)
  const getInitialCollapsed = (): boolean => {
    if (typeof window === "undefined") {
      return true; // Default to collapsed on server
    }
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  };

  const [collapsed, setCollapsed] = useState<boolean>(() => getInitialCollapsed());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save to localStorage whenever collapsed state changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    }
  }, [collapsed, isMounted]);

  // Update CSS variable for main content margin
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-width", collapsed ? "80px" : "250px");
  }, [collapsed]);

  const handleToggle = () => {
    setCollapsed((prev) => !prev);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 64,
          width: "80px",
          height: "calc(100vh - 64px)",
          zIndex: 1000,
          backgroundColor: "var(--bg-primary)",
          borderRight: "1px solid var(--border-color)",
        }}
      />
    );
  }

  return (
    <Sidebar
      collapsed={collapsed}
      style={{
        position: "fixed",
        left: 0,
        top: 64,
        height: "calc(100vh - 64px)",
        zIndex: 1000,
      }}
    >
      <SidebarContent collapsed={collapsed} onToggle={handleToggle} />
    </Sidebar>
  );
}
