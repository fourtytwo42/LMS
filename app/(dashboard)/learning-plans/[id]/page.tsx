"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/store/auth-store";

interface Course {
  id: string;
  title: string;
  order: number;
  estimatedTime: number | null;
  difficultyLevel: string | null;
}

interface LearningPlan {
  id: string;
  code: string | null;
  title: string;
  shortDescription: string | null;
  description: string | null;
  thumbnail: string | null;
  coverImage: string | null;
  status: string;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  publicAccess: boolean;
  selfEnrollment: boolean;
  requiresApproval: boolean;
  maxEnrollments: number | null;
  hasCertificate: boolean;
  hasBadge: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  courses: Course[];
  courseCount: number;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function LearningPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const { user } = useAuthStore();
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [addCourseModalOpen, setAddCourseModalOpen] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseOrder, setCourseOrder] = useState(0);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;
  const canEdit = isAdmin || isInstructor;

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch(`/api/learning-plans/${planId}`);
        if (!response.ok) throw new Error("Failed to fetch learning plan");

        const planData = await response.json();
        setPlan(planData);
        setCourseOrder(planData.courses.length);

        // Fetch available courses
        const coursesResponse = await fetch("/api/courses?limit=1000");
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setAvailableCourses(coursesData.courses);
        }
      } catch (error) {
        console.error("Error fetching learning plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  const handleAddCourse = async () => {
    if (!selectedCourseId) return;

    try {
      const response = await fetch(`/api/learning-plans/${planId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          order: courseOrder,
        }),
      });

      if (!response.ok) throw new Error("Failed to add course");

      setAddCourseModalOpen(false);
      setSelectedCourseId("");
      
      // Refresh plan data
      const planResponse = await fetch(`/api/learning-plans/${planId}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setPlan(planData);
        setCourseOrder(planData.courses.length);
      }
    } catch (error) {
      console.error("Error adding course:", error);
      alert("Failed to add course");
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to remove this course from the learning plan?")) return;

    try {
      const response = await fetch(
        `/api/learning-plans/${planId}/courses/${courseId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to remove course");

      // Refresh plan data
      const planResponse = await fetch(`/api/learning-plans/${planId}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setPlan(planData);
      }
    } catch (error) {
      console.error("Error removing course:", error);
      alert("Failed to remove course");
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!plan) {
    return <div className="py-8 text-center">Learning plan not found</div>;
  }

  // Filter out courses already in the plan
  const availableCoursesList = availableCourses.filter(
    (course) => !plan.courses.some((planCourse) => planCourse.id === course.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/learning-plans")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{plan.title}</h1>
        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/learning-plans/${planId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          {plan.coverImage && (
            <img
              src={plan.coverImage}
              alt={plan.title}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge
              variant={
                plan.status === "PUBLISHED"
                  ? "success"
                  : plan.status === "DRAFT"
                  ? "warning"
                  : "default"
              }
            >
              {plan.status}
            </Badge>
            {plan.difficultyLevel && (
              <Badge variant="info">{plan.difficultyLevel}</Badge>
            )}
            {plan.category && (
              <Badge variant="default">{plan.category.name}</Badge>
            )}
            {plan.hasCertificate && (
              <Badge variant="success">Certificate</Badge>
            )}
            {plan.hasBadge && <Badge variant="info">Badge</Badge>}
          </div>
          {plan.shortDescription && (
            <p className="mb-4 text-lg text-gray-700">
              {plan.shortDescription}
            </p>
          )}
          {plan.description && (
            <div className="prose max-w-none">
              <p className="text-gray-600 whitespace-pre-wrap">
                {plan.description}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Plan Info</h2>
          <div className="space-y-4">
            {plan.code && (
              <div>
                <div className="text-sm text-gray-500">Code</div>
                <div className="mt-1 text-sm font-medium">{plan.code}</div>
              </div>
            )}
            {plan.estimatedTime && (
              <div>
                <div className="text-sm text-gray-500">Estimated Time</div>
                <div className="mt-1 text-sm font-medium">
                  {plan.estimatedTime} minutes
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500">Enrollments</div>
              <div className="mt-1 text-sm font-medium">
                {plan.enrollmentCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Courses</div>
              <div className="mt-1 text-sm font-medium">{plan.courseCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Settings</div>
              <div className="mt-1 space-y-1 text-sm">
                {plan.publicAccess && (
                  <div className="text-green-600">✓ Public Access</div>
                )}
                {plan.selfEnrollment && (
                  <div className="text-green-600">✓ Self-Enrollment</div>
                )}
                {plan.requiresApproval && (
                  <div className="text-blue-600">Requires Approval</div>
                )}
                {plan.maxEnrollments && (
                  <div className="text-gray-600">
                    Max: {plan.maxEnrollments} enrollments
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Courses</h2>
          {canEdit && (
            <Button
              variant="secondary"
              onClick={() => setAddCourseModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          )}
        </div>

        {plan.courses.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No courses in this learning plan
          </div>
        ) : (
          <div className="space-y-2">
            {plan.courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-semibold">
                    {course.order}
                  </div>
                  <div>
                    <div className="font-medium">{course.title}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {course.estimatedTime && (
                        <span>{course.estimatedTime} min</span>
                      )}
                      {course.difficultyLevel && (
                        <Badge variant="default" className="text-xs">
                          {course.difficultyLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/courses/${course.id}`)}
                  >
                    View
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCourse(course.id)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={addCourseModalOpen}
        onClose={() => {
          setAddCourseModalOpen(false);
          setSelectedCourseId("");
        }}
        title="Add Course to Learning Plan"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Select Course
            </label>
            <Select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">Select a course...</option>
              {availableCoursesList.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Order</label>
            <input
              type="number"
              value={courseOrder}
              onChange={(e) => setCourseOrder(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
              min="0"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setAddCourseModalOpen(false);
                setSelectedCourseId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCourse} disabled={!selectedCourseId}>
              Add Course
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

