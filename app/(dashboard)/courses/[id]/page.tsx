"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, Play, FileText, Presentation, Globe, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";

interface Course {
  id: string;
  code: string | null;
  title: string;
  shortDescription: string | null;
  description: string | null;
  thumbnail: string | null;
  coverImage: string | null;
  status: string;
  type: string;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  publicAccess: boolean;
  selfEnrollment: boolean;
  sequentialRequired: boolean;
  allowSkipping: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  tags: string[];
  rating: number | null;
  reviewCount: number;
  enrollmentCount: number;
  contentItemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  order: number;
  required: boolean;
  completed?: boolean;
  progress?: number;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;
  const canEdit = isAdmin || isInstructor;

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const [courseResponse, contentResponse] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/content`),
        ]);

        if (!courseResponse.ok) throw new Error("Failed to fetch course");
        if (!contentResponse.ok) throw new Error("Failed to fetch content");

        const courseData = await courseResponse.json();
        const contentData = await contentResponse.json();

        setCourse(courseData);
        setContentItems(contentData.contentItems);
      } catch (error) {
        console.error("Error fetching course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const getContentIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <Play className="h-5 w-5" />;
      case "PDF":
        return <FileText className="h-5 w-5" />;
      case "PPT":
        return <Presentation className="h-5 w-5" />;
      case "EXTERNAL":
        return <Globe className="h-5 w-5" />;
      case "HTML":
        return <Code className="h-5 w-5" />;
      case "TEST":
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!course) {
    return <div className="py-8 text-center">Course not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/courses")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{course.title}</h1>
        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/courses/${courseId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          {course.coverImage && (
            <img
              src={course.coverImage}
              alt={course.title}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge
              variant={
                course.status === "PUBLISHED"
                  ? "success"
                  : course.status === "DRAFT"
                  ? "warning"
                  : "default"
              }
            >
              {course.status}
            </Badge>
            <Badge variant="info">{course.type}</Badge>
            {course.difficultyLevel && (
              <Badge variant="default">{course.difficultyLevel}</Badge>
            )}
            {course.category && (
              <Badge variant="default">{course.category.name}</Badge>
            )}
          </div>
          {course.shortDescription && (
            <p className="mb-4 text-lg text-gray-700">
              {course.shortDescription}
            </p>
          )}
          {course.description && (
            <div className="prose max-w-none">
              <p className="text-gray-600 whitespace-pre-wrap">
                {course.description}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Course Info</h2>
          <div className="space-y-4">
            {course.code && (
              <div>
                <div className="text-sm text-gray-500">Code</div>
                <div className="mt-1 text-sm font-medium">{course.code}</div>
              </div>
            )}
            {course.estimatedTime && (
              <div>
                <div className="text-sm text-gray-500">Estimated Time</div>
                <div className="mt-1 text-sm font-medium">
                  {course.estimatedTime} minutes
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500">Enrollments</div>
              <div className="mt-1 text-sm font-medium">
                {course.enrollmentCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Content Items</div>
              <div className="mt-1 text-sm font-medium">
                {course.contentItemCount}
              </div>
            </div>
            {course.rating && (
              <div>
                <div className="text-sm text-gray-500">Rating</div>
                <div className="mt-1 text-sm font-medium">
                  {course.rating.toFixed(1)} ({course.reviewCount} reviews)
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500">Settings</div>
              <div className="mt-1 space-y-1 text-sm">
                {course.publicAccess && (
                  <div className="text-green-600">✓ Public Access</div>
                )}
                {course.selfEnrollment && (
                  <div className="text-green-600">✓ Self-Enrollment</div>
                )}
                {course.sequentialRequired && (
                  <div className="text-blue-600">Sequential Required</div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Content Items</h2>
          {canEdit && (
            <Button
              onClick={() => router.push(`/courses/${courseId}/content/new`)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Button>
          )}
        </div>

        {contentItems.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No content items yet
          </div>
        ) : (
          <div className="space-y-2">
            {contentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    {getContentIcon(item.type)}
                  </div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Badge variant="default" className="text-xs">
                        {item.type}
                      </Badge>
                      {item.required && (
                        <Badge variant="warning" className="text-xs">
                          Required
                        </Badge>
                      )}
                      <span>Order: {item.order}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.progress !== undefined && (
                    <div className="text-sm text-gray-500">
                      {Math.round(item.progress * 100)}%
                    </div>
                  )}
                  {canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/courses/${courseId}/content/${item.id}/edit`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (
                            confirm(
                              "Are you sure you want to delete this content item?"
                            )
                          ) {
                            try {
                              const response = await fetch(
                                `/api/content/${item.id}`,
                                { method: "DELETE" }
                              );
                              if (response.ok) {
                                setContentItems((items) =>
                                  items.filter((i) => i.id !== item.id)
                                );
                              }
                            } catch (error) {
                              alert("Failed to delete content item");
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                  {!canEdit && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        router.push(`/courses/${courseId}/content/${item.id}`)
                      }
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

