"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  TrendingUp,
  GraduationCap,
} from "lucide-react";

interface LearnerStats {
  enrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  certificatesEarned: number;
  totalLearningTime: number;
  averageProgress: number;
}

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title: string;
    thumbnail?: string;
  };
  status: string;
  progress?: number;
  enrolledAt: string;
}

export default function LearnerDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<LearnerStats | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch learner's enrollments
        const enrollmentsResponse = await fetch("/api/enrollments?limit=100");
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json();
          const enrollments = enrollmentsData.enrollments || [];
          setEnrolledCourses(enrollments);

          const completed = enrollments.filter((e: any) => e.status === "COMPLETED").length;
          const active = enrollments.filter((e: any) => e.status === "ACTIVE").length;

          setStats({
            enrolledCourses: enrollments.length,
            completedCourses: completed,
            inProgressCourses: active,
            certificatesEarned: 0, // Fetch from certificates API if available
            totalLearningTime: 0, // Calculate from progress if available
            averageProgress: 0, // Calculate from progress if available
          });
        }
      } catch (error) {
        console.error("Error fetching learner dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: "Enrolled Courses",
      value: stats?.enrolledCourses || 0,
      icon: BookOpen,
      href: "/courses",
      color: "bg-blue-500",
    },
    {
      title: "In Progress",
      value: stats?.inProgressCourses || 0,
      icon: Clock,
      href: "/courses?status=active",
      color: "bg-yellow-500",
    },
    {
      title: "Completed",
      value: stats?.completedCourses || 0,
      icon: CheckCircle,
      href: "/courses?status=completed",
      color: "bg-green-500",
    },
    {
      title: "Certificates",
      value: stats?.certificatesEarned || 0,
      icon: Award,
      href: "/certificates",
      color: "bg-purple-500",
    },
  ];

  const quickActions = [
    { label: "Browse Catalog", href: "/catalog", icon: BookOpen },
    { label: "My Courses", href: "/courses", icon: GraduationCap },
    { label: "My Certificates", href: "/certificates", icon: Award },
  ];

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">My Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Welcome back, {user?.firstName} {user?.lastName}! Continue your learning journey.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
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

      {/* My Courses */}
      {enrolledCourses.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Enrolled Courses</h2>
            <Link href="/courses">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {enrolledCourses.slice(0, 5).map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/courses/${enrollment.course.id}`}
                className="flex items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{enrollment.course.title}</p>
                    <p className="text-sm text-gray-500">
                      {enrollment.status} {enrollment.progress ? `• ${enrollment.progress}% complete` : ""}
                    </p>
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Continue Learning */}
      {enrolledCourses.filter((e) => e.status === "ACTIVE").length > 0 && (
        <Card className="p-5 sm:p-6 mt-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Continue Learning</h2>
          <div className="space-y-2.5 sm:space-y-3">
            {enrolledCourses
              .filter((e) => e.status === "ACTIVE")
              .slice(0, 3)
              .map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/courses/${enrollment.course.id}`}
                  className="flex items-center justify-between p-4 sm:p-5 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors bg-white hover:bg-blue-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{enrollment.course.title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {enrollment.progress ? `${enrollment.progress}% complete` : "Start learning"}
                    </p>
                  </div>
                  <Button variant="primary" size="sm">Continue</Button>
                </Link>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
