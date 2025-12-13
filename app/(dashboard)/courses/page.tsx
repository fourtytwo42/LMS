"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";

interface Course {
  id: string;
  code: string | null;
  title: string;
  shortDescription: string | null;
  thumbnail: string | null;
  status: string;
  type: string;
  estimatedTime: number | null;
  difficultyLevel: string | null;
  publicAccess: boolean;
  selfEnrollment: boolean;
  rating: number | null;
  reviewCount: number;
  category: {
    id: string;
    name: string;
  } | null;
  enrollmentCount: number;
  contentItemCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/courses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch courses");

      const data = await response.json();
      setCourses(data.courses);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [pagination.page, search, statusFilter]);

  const handleDelete = async () => {
    if (!courseToDelete) return;

    try {
      const response = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete course");

      setDeleteModalOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course");
    }
  };

  const handlePublish = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/publish`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to publish course");

      fetchCourses();
    } catch (error) {
      console.error("Error publishing course:", error);
      alert("Failed to publish course");
    }
  };

  const handleArchive = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/archive`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to archive course");

      fetchCourses();
    } catch (error) {
      console.error("Error archiving course:", error);
      alert("Failed to archive course");
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Courses</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage and view all courses</p>
        </div>
        {(isAdmin || isInstructor) && (
          <Button onClick={() => router.push("/courses/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
          {(isAdmin || isInstructor) && (
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-40"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          )}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No courses found</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {courses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <div className="mb-4">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5">{course.title}</h3>
                    {course.code && (
                      <p className="text-sm text-gray-500 mb-2">{course.code}</p>
                    )}
                    {course.shortDescription && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {course.shortDescription}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
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
                    {course.difficultyLevel && (
                      <Badge variant="info">{course.difficultyLevel}</Badge>
                    )}
                    {course.category && (
                      <Badge variant="default">{course.category.name}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{course.enrollmentCount} enrollments</span>
                    <span>{course.contentItemCount} items</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/courses/${course.id}`)}
                    >
                      View
                    </Button>
                    {(isAdmin || isInstructor) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/courses/${course.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {course.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(course.id)}
                            title="Publish"
                          >
                            Publish
                          </Button>
                        )}
                        {course.status === "PUBLISHED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(course.id)}
                            title="Archive"
                          >
                            Archive
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCourseToDelete(course);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                  of {pagination.total} courses
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page - 1 }))
                    }
                    className="text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page + 1 }))
                    }
                    className="text-gray-900 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCourseToDelete(null);
        }}
        title="Delete Course"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete the course{" "}
            <strong>{courseToDelete?.title}</strong>? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false);
                setCourseToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

