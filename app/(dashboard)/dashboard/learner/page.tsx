"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Award, CheckCircle, Lock, Play, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Image from "next/image";

interface LearningPlan {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  coverImage: string | null;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  status: string;
  enrollmentStatus?: "AVAILABLE" | "ENROLLED" | "COMPLETED";
  enrollmentId?: string;
  progress?: number;
}

interface Course {
  id: string;
  title: string;
  shortDescription: string | null;
  coverImage: string | null;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  status: string;
  enrollmentStatus?: "AVAILABLE" | "ENROLLED" | "COMPLETED";
  enrollmentId?: string;
  progress?: number;
}

export default function LearnerDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch learning plans and courses with group access (API handles filtering automatically for learners)
      const [learningPlansResponse, coursesResponse, enrollmentsResponse] = await Promise.all([
        fetch("/api/learning-plans"),
        fetch("/api/courses"),
        fetch("/api/enrollments?limit=1000"),
      ]);

      const learningPlansData = learningPlansResponse.ok ? await learningPlansResponse.json() : { learningPlans: [] };
      const coursesData = coursesResponse.ok ? await coursesResponse.json() : { courses: [] };
      const enrollmentsData = enrollmentsResponse.ok ? await enrollmentsResponse.json() : { enrollments: [] };

      const enrollments = enrollmentsData.enrollments || [];
      
      // Map enrollments by learning plan and course IDs
      const learningPlanEnrollments = new Map<string, any>();
      const courseEnrollments = new Map<string, any>();
      
      enrollments.forEach((enrollment: any) => {
        if (enrollment.learningPlanId) {
          learningPlanEnrollments.set(enrollment.learningPlanId, enrollment);
        }
        if (enrollment.courseId) {
          courseEnrollments.set(enrollment.courseId, enrollment);
        }
      });

      // Process learning plans
      const processedLearningPlans = (learningPlansData.learningPlans || []).map((lp: any) => {
        const enrollment = learningPlanEnrollments.get(lp.id);
        return {
          ...lp,
          enrollmentStatus: enrollment 
            ? (enrollment.status === "COMPLETED" ? "COMPLETED" : "ENROLLED")
            : "AVAILABLE",
          enrollmentId: enrollment?.id,
          progress: enrollment?.progress || 0,
        };
      });

      // Process courses - only show courses that are directly in the learner's groups
      // (not courses from learning plans unless enrolled in the learning plan)
      const processedCourses = (coursesData.courses || []).map((course: any) => {
        const enrollment = courseEnrollments.get(course.id);
        return {
          ...course,
          enrollmentStatus: enrollment 
            ? (enrollment.status === "COMPLETED" ? "COMPLETED" : "ENROLLED")
            : "AVAILABLE",
          enrollmentId: enrollment?.id,
          progress: enrollment?.progress || 0,
        };
      });

      setLearningPlans(processedLearningPlans);
      setCourses(processedCourses);
    } catch (error) {
      console.error("Error fetching learner dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (type: "learningPlan" | "course", id: string) => {
    try {
      setEnrolling(id);
      const response = await fetch("/api/enrollments/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [type === "learningPlan" ? "learningPlanId" : "courseId"]: id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Failed to enroll");
        return;
      }

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error enrolling:", error);
      alert("Failed to enroll. Please try again.");
    } finally {
      setEnrolling(null);
    }
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "INTERMEDIATE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "ADVANCED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "N/A";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const availableLearningPlans = learningPlans.filter(lp => lp.enrollmentStatus === "AVAILABLE");
  const enrolledLearningPlans = learningPlans.filter(lp => lp.enrollmentStatus === "ENROLLED");
  const completedLearningPlans = learningPlans.filter(lp => lp.enrollmentStatus === "COMPLETED");

  const availableCourses = courses.filter(c => c.enrollmentStatus === "AVAILABLE");
  const enrolledCourses = courses.filter(c => c.enrollmentStatus === "ENROLLED");
  const completedCourses = courses.filter(c => c.enrollmentStatus === "COMPLETED");

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderItem = (
    item: LearningPlan | Course,
    type: "learningPlan" | "course",
    status: "AVAILABLE" | "ENROLLED" | "COMPLETED"
  ) => {
    const isEnrolling = enrolling === item.id;
    const href = type === "learningPlan" 
      ? `/learning-plans/${item.id}` 
      : `/courses/${item.id}`;

    return (
      <Card
        key={item.id}
        className={cn(
          "overflow-hidden transition-all duration-300 hover:shadow-lg",
          status === "COMPLETED" && "opacity-75"
        )}
      >
        {/* Cover Image */}
        {item.coverImage && (
          <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800">
            <Image
              src={item.coverImage}
              alt={item.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <div className="p-6">
          {/* Title and Status */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
              {item.title}
            </h3>
            {item.shortDescription && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {item.shortDescription}
              </p>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {item.estimatedTime && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{formatTime(item.estimatedTime)}</span>
              </div>
            )}
            {item.difficultyLevel && (
              <Badge className={cn("text-xs", getDifficultyColor(item.difficultyLevel))}>
                {item.difficultyLevel}
              </Badge>
            )}
            {status === "ENROLLED" && item.progress !== undefined && (
              <Badge variant="info" className="text-xs">
                {Math.round(item.progress)}% Complete
              </Badge>
            )}
            {status === "COMPLETED" && (
              <Badge variant="success" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {status === "AVAILABLE" && (
              <Button
                onClick={() => handleEnroll(type, item.id)}
                disabled={isEnrolling}
                className="flex-1"
                variant="primary"
              >
                {isEnrolling ? "Enrolling..." : "Enroll"}
              </Button>
            )}
            {status === "ENROLLED" && (
              <>
                <Button
                  onClick={() => router.push(href)}
                  className="flex-1"
                  variant="primary"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Continue
                </Button>
                <Button
                  onClick={() => router.push(href)}
                  variant="ghost"
                  size="sm"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {status === "COMPLETED" && (
              <Button
                onClick={() => router.push(href)}
                className="flex-1"
                variant="secondary"
              >
                <Award className="h-4 w-4 mr-2" />
                View Certificate
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderSection = (
    title: string,
    items: (LearningPlan | Course)[],
    type: "learningPlan" | "course",
    status: "AVAILABLE" | "ENROLLED" | "COMPLETED",
    emptyMessage: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          <Badge variant="default" className="text-sm">
            {items.length} {items.length === 1 ? "item" : "items"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => renderItem(item, type, status))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Continue your learning journey or explore new opportunities.
        </p>
      </div>

      {/* Learning Plans */}
      {(availableLearningPlans.length > 0 || enrolledLearningPlans.length > 0 || completedLearningPlans.length > 0) && (
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Learning Plans</h2>
          </div>

          {renderSection(
            "Available Learning Plans",
            availableLearningPlans,
            "learningPlan",
            "AVAILABLE",
            "No available learning plans"
          )}

          {renderSection(
            "In Progress",
            enrolledLearningPlans,
            "learningPlan",
            "ENROLLED",
            "No learning plans in progress"
          )}

          {renderSection(
            "Completed",
            completedLearningPlans,
            "learningPlan",
            "COMPLETED",
            "No completed learning plans"
          )}
        </div>
      )}

      {/* Courses */}
      {(availableCourses.length > 0 || enrolledCourses.length > 0 || completedCourses.length > 0) && (
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Courses</h2>
          </div>

          {renderSection(
            "Available Courses",
            availableCourses,
            "course",
            "AVAILABLE",
            "No available courses"
          )}

          {renderSection(
            "In Progress",
            enrolledCourses,
            "course",
            "ENROLLED",
            "No courses in progress"
          )}

          {renderSection(
            "Completed",
            completedCourses,
            "course",
            "COMPLETED",
            "No completed courses"
          )}
        </div>
      )}

      {/* Empty State */}
      {learningPlans.length === 0 && courses.length === 0 && (
        <Card className="p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Learning Content Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Contact your administrator to get access to learning plans and courses.
          </p>
        </Card>
      )}
    </div>
  );
}
