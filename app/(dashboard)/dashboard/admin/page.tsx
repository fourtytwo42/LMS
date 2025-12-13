"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  UserCheck,
  FolderTree,
  Award,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalLearningPlans: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalCategories: number;
  totalCertificates: number;
  pendingNotifications: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/analytics/overview");
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalUsers: data.users?.total || 0,
            totalCourses: data.courses?.total || 0,
            totalLearningPlans: data.learningPlans?.total || 0,
            totalEnrollments: data.enrollments?.total || 0,
            activeEnrollments: data.enrollments?.active || 0,
            completedEnrollments: data.enrollments?.completed || 0,
            totalCategories: 0, // Add if available in API
            totalCertificates: 0, // Add if available in API
            pendingNotifications: 0, // Add if available in API
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      href: "/users",
      color: "bg-blue-500",
    },
    {
      title: "Total Courses",
      value: stats?.totalCourses || 0,
      icon: BookOpen,
      href: "/courses",
      color: "bg-green-500",
    },
    {
      title: "Learning Plans",
      value: stats?.totalLearningPlans || 0,
      icon: GraduationCap,
      href: "/learning-plans",
      color: "bg-purple-500",
    },
    {
      title: "Total Enrollments",
      value: stats?.totalEnrollments || 0,
      icon: UserCheck,
      href: "/enrollments",
      color: "bg-orange-500",
    },
    {
      title: "Active Enrollments",
      value: stats?.activeEnrollments || 0,
      icon: UserCheck,
      href: "/enrollments?status=ACTIVE",
      color: "bg-teal-500",
    },
    {
      title: "Completed",
      value: stats?.completedEnrollments || 0,
      icon: Award,
      href: "/enrollments?status=COMPLETED",
      color: "bg-indigo-500",
    },
  ];

  const quickActions = [
    { label: "Create Course", href: "/courses/new", icon: BookOpen },
    { label: "Create Learning Plan", href: "/learning-plans/new", icon: GraduationCap },
    { label: "Manage Users", href: "/users", icon: Users },
    { label: "Manage Categories", href: "/categories", icon: FolderTree },
    { label: "View Analytics", href: "/analytics", icon: BarChart3 },
    { label: "View Enrollments", href: "/enrollments", icon: UserCheck },
  ];

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 sm:space-y-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Welcome back, {user?.firstName} {user?.lastName}! Here's an overview of your LMS.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4 sm:mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{action.label}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity or Additional Info */}
      <Card>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">System Overview</h2>
        <div className="space-y-2.5 sm:space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>• Manage all users, courses, and learning plans from this dashboard</p>
          <p>• View detailed analytics and reports in the Analytics section</p>
          <p>• Monitor enrollments and track learner progress</p>
          <p>• Configure system settings and manage categories</p>
        </div>
      </Card>
    </div>
  );
}
