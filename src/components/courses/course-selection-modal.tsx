"use client";

import { useState, useEffect } from "react";
import { BookOpen, ArrowUp, ArrowDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { CheckSquare as CheckSquareIcon, Square as SquareIcon } from "lucide-react";

interface Course {
  id: string;
  title: string;
  shortDescription: string | null;
  status: string;
  coverImage: string | null;
}

interface CourseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (courseIds: string[]) => Promise<void>;
  title: string;
  actionLabel?: string;
  excludeCourseIds?: Set<string>; // Courses to exclude from the list
  singleSelect?: boolean; // If true, only one course can be selected
}

export function CourseSelectionModal({
  isOpen,
  onClose,
  onSelect,
  title,
  actionLabel = "Select",
  excludeCourseIds = new Set(),
  singleSelect = false,
}: CourseSelectionModalProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<string>("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch courses when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      setSearch("");
      setSelectedCourseIds(new Set());
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      setSortBy("title");
      setSortOrder("asc");
    }
  }, [isOpen]);

  // Fetch courses when search, page, or sort changes
  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
  }, [search, pagination.page, sortBy, sortOrder, isOpen]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/courses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch courses");

      const data = await response.json();
      
      // Filter out excluded courses
      const filteredCourses = (data.courses || []).filter(
        (course: Course) => !excludeCourseIds.has(course.id)
      );

      // Sort courses
      const sortedCourses = [...filteredCourses].sort((a, b) => {
        let aVal: string;
        let bVal: string;
        
        if (sortBy === "title") {
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
        } else {
          aVal = "";
          bVal = "";
        }
        
        if (sortOrder === "asc") {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });

      setCourses(sortedCourses);
      setPagination({
        ...pagination,
        total: data.pagination?.total || filteredCourses.length,
        totalPages: data.pagination?.totalPages || 1,
      });
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    if (singleSelect) {
      setSelectedCourseIds(new Set([courseId]));
    } else {
      setSelectedCourseIds((prev) => {
        const next = new Set(prev);
        if (next.has(courseId)) {
          next.delete(courseId);
        } else {
          next.add(courseId);
        }
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedCourseIds.size === courses.length) {
      setSelectedCourseIds(new Set());
    } else {
      setSelectedCourseIds(new Set(courses.map((c) => c.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedCourseIds.size === 0) return;

    setSubmitting(true);
    try {
      await onSelect(Array.from(selectedCourseIds));
      setSelectedCourseIds(new Set());
      onClose();
    } catch (error) {
      console.error("Error in course selection:", error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
    >
      {label}
      {sortBy === column && (
        <span className="text-xs">
          {sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        </span>
      )}
    </button>
  );

  const isAllSelected = courses.length > 0 && selectedCourseIds.size === courses.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <TableToolbar
          search={{
            value: search,
            onChange: (value) => {
              setSearch(value);
              setPagination((p) => ({ ...p, page: 1 }));
            },
            placeholder: "Search courses...",
          }}
        />

        {selectedCourseIds.size > 0 && !singleSelect && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedCourseIds.size} course(s) selected
            </div>
            <Button onClick={handleSubmit} variant="primary" disabled={submitting}>
              <BookOpen className="mr-2 h-4 w-4" />
              {actionLabel} Selected
            </Button>
          </div>
        )}

        <div className="max-h-96 overflow-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : courses.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">No courses available</div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!singleSelect && (
                        <TableHead className="w-12">
                          <button
                            onClick={handleSelectAll}
                            className="flex items-center justify-center"
                          >
                            {isAllSelected ? (
                              <CheckSquareIcon className="h-5 w-5 text-blue-600" />
                            ) : (
                              <SquareIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </TableHead>
                      )}
                      <TableHead>
                        <SortableHeader column="title" label="Title" />
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        {!singleSelect && (
                          <TableCell>
                            <button
                              onClick={() => handleSelectCourse(course.id)}
                              className="flex items-center justify-center"
                            >
                              {selectedCourseIds.has(course.id) ? (
                                <CheckSquareIcon className="h-5 w-5 text-blue-600" />
                              ) : (
                                <SquareIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {course.title}
                            </div>
                            {course.shortDescription && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {course.shortDescription}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={course.status === "PUBLISHED" ? "success" : "default"}>
                            {course.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <TablePagination
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            itemName="courses"
          />
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCourseIds.size === 0 || submitting}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {actionLabel}{" "}
            {selectedCourseIds.size > 0
              ? `${selectedCourseIds.size} `
              : ""}
            Course{selectedCourseIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

