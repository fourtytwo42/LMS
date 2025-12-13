"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  BookOpen,
  Users,
  BarChart3,
  UserCheck,
  Clock,
  Award,
} from "lucide-react";

interface InstructorStats {
  myCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  pendingApprovals: number;
  averageCompletionRate: number;
}

export default function InstructorDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch instructor's courses
        const coursesResponse = await fetch("/api/courses?limit=5");
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setRecentCourses(coursesData.courses || []);
        }

        // Fetch enrollments
        const enrollmentsResponse = await fetch("/api/enrollments?limit=100");
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json();
          const enrollments = enrollmentsData.enrollments || [];
          
          setStats({
            myCourses: recentCourses.length,
            totalEnrollments: enrollments.length,
            activeEnrollments: enrollments.filter((e: any) => e.status === "ACTIVE").length,
            completedEnrollments: enrollments.filter((e: any) => e.status === "COMPLETED").length,
            pendingApprovals: enrollments.filter((e: any) => e.status === "PENDING").length,
            averageCompletionRate: 0, // Calculate if needed
          });
        }
      } catch (error) {
        console.error("Error fetching instructor dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: "My Courses",
      value: stats?.myCourses || 0,
      icon: BookOpen,
      href: "/courses",
      color: "bg-blue-500",
    },
    {
      title: "Total Enrollments",
      value: stats?.totalEnrollments || 0,
      icon: UserCheck,
      href: "/enrollments",
      color: "bg-green-500",
    },
    {
      title: "Active Learners",
      value: stats?.activeEnrollments || 0,
      icon: Users,
      href: "/enrollments?status=ACTIVE",
      color: "bg-purple-500",
    },
    {
      title: "Pending Approvals",
      value: stats?.pendingApprovals || 0,
      icon: Clock,
      href: "/enrollments?status=PENDING",
      color: "bg-orange-500",
    },
    {
      title: "Completed",
      value: stats?.completedEnrollments || 0,
      icon: Award,
      href: "/enrollments?status=COMPLETED",
      color: "bg-teal-500",
    },
  ];

  const quickActions = [
    { label: "Create New Course", href: "/courses/new", icon: BookOpen },
    { label: "View All Courses", href: "/courses", icon: BookOpen },
    { label: "Manage Enrollments", href: "/enrollments", icon: UserCheck },
    { label: "View Analytics", href: "/analytics", icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Instructor Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Welcome back, {user?.firstName} {user?.lastName}! Manage your courses and track learner progress.
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
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-sm sm:text-base text-gray-900">{action.label}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Courses */}
      {recentCourses.length > 0 && (
        <Card>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Recent Courses</h2>
          <div className="space-y-2.5 sm:space-y-3">
            {recentCourses.slice(0, 5).map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="flex items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
              >
                <div>
                  <p className="font-medium text-gray-900">{course.title}</p>
                  <p className="text-sm text-gray-500">
                    {course.enrollmentCount || 0} enrollments
                  </p>
                </div>
                <BookOpen className="h-5 w-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
