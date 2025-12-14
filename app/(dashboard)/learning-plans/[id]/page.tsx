"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Edit, Trash2, Save, Upload, X, UserPlus, Search, Send, ChevronUp, ChevronDown, CheckSquare, Square, BookOpen, Users, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/tables/data-table";
import type { Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";
import { UserSelectionModal } from "@/components/users/user-selection-modal";
import { GroupSelectionModal } from "@/components/groups/group-selection-modal";
import { IconButton } from "@/components/ui/icon-button";

const updateLearningPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  shortDescription: z.string().max(130).optional(),
  description: z.string().optional(),
  estimatedTime: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined || (typeof val === "number" && isNaN(val))) {
        return undefined;
      }
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().int().positive().optional().nullable()
  ),
  difficultyLevel: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) {
        return undefined;
      }
      return val;
    },
    z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable()
  ),
  publicAccess: z.boolean().optional(),
  selfEnrollment: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  maxEnrollments: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined || (typeof val === "number" && isNaN(val))) {
        return undefined;
      }
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().int().positive().optional().nullable()
  ),
  hasCertificate: z.boolean().optional(),
  hasBadge: z.boolean().optional(),
  coverImage: z.string().optional(),
});

type UpdateLearningPlanForm = z.infer<typeof updateLearningPlanSchema>;

interface Course {
  id: string;
  title: string;
  coverImage: string | null;
  shortDescription: string | null;
  status: string;
  order: number;
  estimatedTime: number | null;
  difficultyLevel: string | null;
}

interface LearningPlan {
  id: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
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
  createdBy: {
    id: string;
  };
  courses: Course[];
  courseCount: number;
  enrollmentCount: number;
}

interface Enrollment {
  id: string;
  userId: string;
  status: string;
  enrolledAt: string;
  startedAt: string | null;
  dueDate: string | null;
  progress: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
    isInstructor: boolean;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LearningPlanEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.id as string;
  const { user } = useAuthStore();
  
  // Learning plan data
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; type: string; description: string | null; addedAt: string }>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tab = searchParams.get("tab");
    return tab || "details";
  });

  // Details tab - form
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  
  const {
    register: registerDetails,
    handleSubmit: handleSubmitDetails,
    formState: { errors: detailsErrors },
    setValue: setDetailsValue,
    watch: watchDetails,
  } = useForm<UpdateLearningPlanForm>({
    resolver: zodResolver(updateLearningPlanSchema),
  });

  // Courses tab
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; title: string; coverImage: string | null; shortDescription: string | null; status: string; estimatedTime: number | null; difficultyLevel: string | null }>>([]);
  const [addCourseModalOpen, setAddCourseModalOpen] = useState(false);
  const [selectedCourseIdsForAdd, setSelectedCourseIdsForAdd] = useState<Set<string>>(new Set());
  const [courseOrder, setCourseOrder] = useState(0);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [bulkDeleteCoursesModalOpen, setBulkDeleteCoursesModalOpen] = useState(false);
  const [coursesPagination, setCoursesPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [coursesSearch, setCoursesSearch] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Enrollments tab
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsPagination, setEnrollmentsPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsSearch, setEnrollmentsSearch] = useState("");
  const [enrollmentsStatusFilter, setEnrollmentsStatusFilter] = useState("");
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [deleteEnrollmentModalOpen, setDeleteEnrollmentModalOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<Enrollment | null>(null);
  const [selectedRole, setSelectedRole] = useState<"LEARNER" | "INSTRUCTOR">("LEARNER");

  // Settings tab - form
  const {
    register: registerSettings,
    handleSubmit: handleSubmitSettings,
    formState: { errors: settingsErrors },
    setValue: setSettingsValue,
    watch: watchSettings,
  } = useForm<UpdateLearningPlanForm>({
    resolver: zodResolver(updateLearningPlanSchema),
  });

  const [publishing, setPublishing] = useState(false);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isCreator = plan?.createdBy.id === user?.id || false;
  // For instructor access, we'll rely on API permission checks (403 if no access)
  const canEdit = isAdmin || isCreator;
  const isLearner = !isAdmin && !isCreator && !user?.roles?.includes("INSTRUCTOR");

  // Check if user has view access (not just edit access)
  const [hasViewAccess, setHasViewAccess] = useState(false);
  
  // Enrollment status for learners
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Handle self-enrollment
  const handleSelfEnroll = async () => {
    if (!user || !planId) return;
    
    setEnrolling(true);
    try {
      const response = await fetch("/api/enrollments/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learningPlanId: planId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to enroll");
      }

      const data = await response.json();
      setIsEnrolled(true);
      setEnrollmentStatus("ENROLLED");
      alert(data.enrollment?.message || "Successfully enrolled!");
      
      // Refresh plan data to update enrollment count
      const planResponse = await fetch(`/api/learning-plans/${planId}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setPlan(planData);
      }
    } catch (error) {
      console.error("Error enrolling:", error);
      alert(`Enrollment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setEnrolling(false);
    }
  };

  // Check access permissions
  useEffect(() => {
    if (!loading && planId) {
      fetch(`/api/learning-plans/${planId}`)
        .then((res) => {
          if (res.status === 403) {
            router.push("/learning-plans");
          } else if (res.ok) {
            setHasViewAccess(true);
          }
        })
        .catch(() => {
          router.push("/learning-plans");
        });
    }
  }, [loading, planId, router]);

  // Fetch learning plan data
  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      try {
        const planResponse = await fetch(`/api/learning-plans/${planId}`);

        if (!planResponse.ok) {
          if (planResponse.status === 403) {
            router.push("/learning-plans");
            return;
          }
          throw new Error("Failed to fetch learning plan");
        }
        
        // User has access, set view access
        setHasViewAccess(true);

        const planData = await planResponse.json();
        setPlan(planData);

        // Check enrollment status for learners
        if (isLearner && user) {
          try {
            const enrollmentResponse = await fetch(`/api/enrollments?learningPlanId=${planId}&userId=${user.id}`);
            if (enrollmentResponse.ok) {
              const enrollmentData = await enrollmentResponse.json();
              const userEnrollment = enrollmentData.enrollments?.find((e: any) => e.userId === user.id);
              if (userEnrollment) {
                setIsEnrolled(true);
                setEnrollmentStatus(userEnrollment.status);
              }
            }
          } catch (error) {
            console.error("Error checking enrollment:", error);
          }
        }

        // Set form values
        setDetailsValue("title", planData.title);
        setDetailsValue("shortDescription", planData.shortDescription || "");
        setDetailsValue("description", planData.description || "");
        setDetailsValue("estimatedTime", planData.estimatedTime);
        setDetailsValue("difficultyLevel", planData.difficultyLevel);
        setDetailsValue("publicAccess", planData.publicAccess);
        setDetailsValue("selfEnrollment", planData.selfEnrollment);
        setDetailsValue("requiresApproval", planData.requiresApproval);
        setDetailsValue("maxEnrollments", planData.maxEnrollments);
        setDetailsValue("hasCertificate", planData.hasCertificate);
        setDetailsValue("hasBadge", planData.hasBadge);
        setDetailsValue("coverImage", planData.coverImage || "");
        
        setSettingsValue("title", planData.title);
        setSettingsValue("shortDescription", planData.shortDescription || "");
        setSettingsValue("description", planData.description || "");
        setSettingsValue("estimatedTime", planData.estimatedTime);
        setSettingsValue("difficultyLevel", planData.difficultyLevel);
        setSettingsValue("publicAccess", planData.publicAccess);
        setSettingsValue("selfEnrollment", planData.selfEnrollment);
        setSettingsValue("requiresApproval", planData.requiresApproval);
        setSettingsValue("maxEnrollments", planData.maxEnrollments);
        setSettingsValue("hasCertificate", planData.hasCertificate);
        setSettingsValue("hasBadge", planData.hasBadge);
        setSettingsValue("coverImage", planData.coverImage || "");

        if (planData.coverImage) {
          setCoverImagePreview(planData.coverImage);
        }

        setCourseOrder(planData.courses.length);
      } catch (error) {
        console.error("Error fetching learning plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, setDetailsValue, setSettingsValue, router]);

  // Fetch enrollments when Enrollments tab is active
  useEffect(() => {
    if (activeTab === "enrollments" && planId) {
      fetchEnrollments();
    }
  }, [activeTab, enrollmentsPagination.page, enrollmentsSearch, enrollmentsStatusFilter, planId]);

  // Fetch groups when Groups tab is active
  useEffect(() => {
    if (activeTab === "groups" && planId && !loading) {
      console.log(`[Learning Plan Groups Tab] Fetching groups for planId: ${planId}, activeTab: ${activeTab}, loading: ${loading}`);
      const fetchGroupsData = async () => {
        setGroupsLoading(true);
        try {
          console.log(`[Learning Plan Groups Tab] Making API call to /api/learning-plans/${planId}/groups`);
          const response = await fetch(`/api/learning-plans/${planId}/groups`);
          console.log(`[Learning Plan Groups Tab] Response status: ${response.status}, ok: ${response.ok}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[Learning Plan Groups Tab] Failed to fetch groups:", response.status, response.statusText, errorData);
            alert(`Error fetching groups (${response.status}): ${errorData.message || response.statusText}`);
            setGroups([]); // Clear groups on error
            return;
          }

          const data = await response.json();
          console.log("[Learning Plan Groups Tab] Fetched groups data:", JSON.stringify(data, null, 2));
          let filteredGroups = data.groups || [];
          console.log(`[Learning Plan Groups Tab] Raw groups count: ${filteredGroups.length}`);

          if (groupSearch) {
            filteredGroups = filteredGroups.filter((group: { name: string; description: string | null }) =>
              group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
              (group.description && group.description.toLowerCase().includes(groupSearch.toLowerCase()))
            );
            console.log(`[Learning Plan Groups Tab] Filtered groups count after search: ${filteredGroups.length}`);
          }

          console.log("[Learning Plan Groups Tab] Setting groups:", filteredGroups);
          setGroups(filteredGroups);
        } catch (error) {
          console.error("[Learning Plan Groups Tab] Error fetching groups:", error);
          alert(`Error fetching groups: ${error instanceof Error ? error.message : "Unknown error"}`);
          setGroups([]); // Clear groups on error
        } finally {
          setGroupsLoading(false);
        }
      };
      
      fetchGroupsData();
    }
  }, [activeTab, groupSearch, planId, loading]);


  const fetchEnrollments = async () => {
    setEnrollmentsLoading(true);
    try {
      const params = new URLSearchParams({
        page: enrollmentsPagination.page.toString(),
        limit: enrollmentsPagination.limit.toString(),
      });
      if (enrollmentsSearch) params.append("search", enrollmentsSearch);
      if (enrollmentsStatusFilter) params.append("status", enrollmentsStatusFilter);

      const response = await fetch(`/api/learning-plans/${planId}/enrollments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch enrollments");

      const data = await response.json();
      setEnrollments(data.enrollments || []);
      setEnrollmentsPagination({
        page: data.pagination?.page || enrollmentsPagination.page,
        limit: data.pagination?.limit || enrollmentsPagination.limit,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!planId) return;
    
    setGroupsLoading(true);
    try {
      const response = await fetch(`/api/learning-plans/${planId}/groups`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch groups:", response.status, response.statusText, errorData);
        throw new Error(`Failed to fetch groups: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched groups data:", data);
      let filteredGroups = data.groups || [];

      if (groupSearch) {
        filteredGroups = filteredGroups.filter((group: { name: string; description: string | null }) =>
          group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
          (group.description && group.description.toLowerCase().includes(groupSearch.toLowerCase()))
        );
      }

      console.log("Setting groups:", filteredGroups);
      setGroups(filteredGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      alert(`Error fetching groups: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleAddGroups = async (groupIds: string[]) => {
    try {
      const response = await fetch(`/api/learning-plans/${planId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to add groups:", response.status, response.statusText, errorData);
        throw new Error(errorData.message || `Failed to add groups: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Add groups result:", result);
      
      // Check if any groups were actually added
      if (result.results?.added === 0 && result.results?.failed > 0) {
        // All groups failed - show error with details
        const errorMessages = result.results.errors?.map((e: { groupId: string; error: string }) => e.error).join(", ") || "Unknown error";
        alert(`Failed to add groups: ${errorMessages}`);
        throw new Error(`Failed to add groups: ${errorMessages}`);
      } else if (result.results?.added > 0) {
        // Some or all groups were added successfully
        const message = result.results.failed > 0
          ? `Successfully added ${result.results.added} group(s) to learning plan (${result.results.failed} failed)`
          : `Successfully added ${result.results.added} group(s) to learning plan`;
        alert(message);
      } else {
        // Unexpected result
        alert(result.message || "Groups were not added");
      }
      
      // Refresh groups list
      await fetchGroups();
    } catch (error) {
      console.error("Error adding groups:", error);
      // Don't show alert again if we already showed one
      if (!(error instanceof Error && error.message.startsWith("Failed to add groups"))) {
        alert(error instanceof Error ? error.message : "Failed to add groups");
      }
      throw error;
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to remove this group from the learning plan?")) return;

    try {
      const response = await fetch(`/api/learning-plans/${planId}/groups?groupId=${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove group");

      fetchGroups();
    } catch (error) {
      console.error("Error removing group:", error);
      alert("Failed to remove group");
    }
  };

  // Details tab handlers
  const handleCoverImageUploadClick = () => {
    coverImageInputRef.current?.click();
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "COVER");

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload image");
      }

      const result = await response.json();
      const fullUrl = result.file.url.startsWith("http")
        ? result.file.url
        : `${window.location.origin}${result.file.url}`;
      
      setDetailsValue("coverImage", fullUrl);
      setSettingsValue("coverImage", fullUrl);
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
    } catch (error) {
      console.error("Error uploading cover image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingCover(false);
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveCoverImage = () => {
    setDetailsValue("coverImage", "");
    setSettingsValue("coverImage", "");
    setCoverImagePreview(null);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = "";
    }
  };

  const onDetailsSubmit = async (data: UpdateLearningPlanForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/learning-plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          estimatedTime: data.estimatedTime || null,
          difficultyLevel: data.difficultyLevel || null,
          maxEnrollments: data.maxEnrollments || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update learning plan");

      const updatedPlan = await response.json();
      setPlan(updatedPlan);
      alert("Learning plan updated successfully");
    } catch (error) {
      console.error("Error updating learning plan:", error);
      alert("Failed to update learning plan");
    } finally {
      setSaving(false);
    }
  };

  const onSettingsSubmit = async (data: UpdateLearningPlanForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/learning-plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          estimatedTime: data.estimatedTime || null,
          difficultyLevel: data.difficultyLevel || null,
          maxEnrollments: data.maxEnrollments || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update learning plan");

      const updatedPlan = await response.json();
      setPlan(updatedPlan);
      alert("Learning plan settings updated successfully");
    } catch (error) {
      console.error("Error updating learning plan:", error);
      alert("Failed to update learning plan");
    } finally {
      setSaving(false);
    }
  };

  // Fetch available courses for adding to learning plan
  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const params = new URLSearchParams({
        page: coursesPagination.page.toString(),
        limit: coursesPagination.limit.toString(),
      });
      if (coursesSearch) params.append("search", coursesSearch);

      const response = await fetch(`/api/courses?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out courses already in the plan
        const planCourseIds = new Set(plan.courses.map((c) => c.id));
        setAvailableCourses((data.courses || []).filter((c: any) => !planCourseIds.has(c.id)));
        setCoursesPagination({
          page: data.pagination?.page || coursesPagination.page,
          limit: data.pagination?.limit || coursesPagination.limit,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (addCourseModalOpen && plan) {
      fetchCourses();
    } else {
      setCoursesSearch("");
      setCoursesPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      setSelectedCourseIdsForAdd(new Set());
    }
  }, [addCourseModalOpen, plan]);

  useEffect(() => {
    if (addCourseModalOpen && plan) {
      fetchCourses();
    }
  }, [coursesPagination.page, coursesSearch]);

  // Courses tab handlers - for Add Course modal
  const handleSelectAllCoursesForAdd = (checked: boolean) => {
    if (checked) {
      setSelectedCourseIdsForAdd(new Set(availableCourses.map((c) => c.id)));
    } else {
      setSelectedCourseIdsForAdd(new Set());
    }
  };

  const handleSelectCourseForAdd = (courseId: string, checked: boolean) => {
    const newSelected = new Set(selectedCourseIdsForAdd);
    if (checked) {
      newSelected.add(courseId);
    } else {
      newSelected.delete(courseId);
    }
    setSelectedCourseIdsForAdd(newSelected);
  };

  const handleBulkAddCourses = async () => {
    if (selectedCourseIdsForAdd.size === 0) {
      alert("Please select at least one course");
      return;
    }

    try {
      const response = await fetch(`/api/learning-plans/${planId}/courses/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseIds: Array.from(selectedCourseIdsForAdd),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Failed to add courses");
        return;
      }

      const result = await response.json();
      setAddCourseModalOpen(false);
      setSelectedCourseIdsForAdd(new Set());
      
      // Refresh plan data
      const planResponse = await fetch(`/api/learning-plans/${planId}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setPlan(planData);
        setCourseOrder(planData.courses.length);
      }
      alert(`Successfully added ${result.assigned || selectedCourseIdsForAdd.size} course(s)${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
    } catch (error) {
      console.error("Error adding courses:", error);
      alert("Failed to add courses");
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

  const handleSelectAllCourses = (checked: boolean) => {
    if (checked) {
      setSelectedCourseIds(new Set(plan.courses.map((c) => c.id)));
    } else {
      setSelectedCourseIds(new Set());
    }
  };

  const handleSelectCourse = (courseId: string, checked: boolean) => {
    const newSelected = new Set(selectedCourseIds);
    if (checked) {
      newSelected.add(courseId);
    } else {
      newSelected.delete(courseId);
    }
    setSelectedCourseIds(newSelected);
  };

  const handleBulkDeleteCourses = async () => {
    if (selectedCourseIds.size === 0) return;

    try {
      const response = await fetch(`/api/learning-plans/${planId}/courses/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseIds: Array.from(selectedCourseIds),
        }),
      });

      if (!response.ok) throw new Error("Failed to delete courses");

      const data = await response.json();
      alert(`Deleted ${data.deleted} course(s), ${data.failed} failed`);
      setBulkDeleteCoursesModalOpen(false);
      setSelectedCourseIds(new Set());
      
      // Refresh plan data
      const planResponse = await fetch(`/api/learning-plans/${planId}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setPlan(planData);
      }
    } catch (error) {
      console.error("Error deleting courses:", error);
      alert("Failed to delete courses");
    }
  };

  const handleMoveCourse = async (courseId: string, direction: "up" | "down") => {
    if (!plan) return;

    const course = plan.courses.find((c) => c.id === courseId);
    if (!course) return;

    const currentIndex = plan.courses.findIndex((c) => c.id === courseId);
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === plan.courses.length - 1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const targetCourse = plan.courses[newIndex];

    try {
      // Update both courses' orders
      await Promise.all([
        fetch(`/api/learning-plans/${planId}/courses`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: courseId,
            order: targetCourse.order,
          }),
        }),
        fetch(`/api/learning-plans/${planId}/courses`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: targetCourse.id,
            order: course.order,
          }),
        }),
      ]);

      // Refresh plan data
      const planResponse = await fetch(`/api/learning-plans/${planId}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setPlan(planData);
      }
    } catch (error) {
      console.error("Error moving course:", error);
      alert("Failed to move course");
    }
  };

  // Enrollments tab handlers
  const handleEnrollUsers = async (userIds: string[], role?: "LEARNER" | "INSTRUCTOR") => {
    try {
      const response = await fetch(`/api/learning-plans/${planId}/enrollments/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds,
          role: role || "LEARNER",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Failed to enroll users");
        throw new Error(error.message || "Failed to enroll users");
      }

      const result = await response.json();
      setSelectedRole("LEARNER");
      fetchEnrollments();
      alert(`Successfully enrolled ${result.enrolled || userIds.length} user(s)${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
    } catch (error) {
      console.error("Error enrolling users:", error);
      alert("Failed to enroll users");
      throw error;
    }
  };

  const handleDeleteEnrollment = async () => {
    if (!enrollmentToDelete) return;

    try {
      const response = await fetch(`/api/enrollments/${enrollmentToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove enrollment");

      setDeleteEnrollmentModalOpen(false);
      setEnrollmentToDelete(null);
      fetchEnrollments();
    } catch (error) {
      console.error("Error removing enrollment:", error);
      alert("Failed to remove enrollment");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENROLLED":
        return <Badge variant="default">Enrolled</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="primary">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "PENDING_APPROVAL":
        return <Badge variant="warning">Pending Approval</Badge>;
      case "DROPPED":
        return <Badge variant="danger">Dropped</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Publish handler
  const handlePublish = async () => {
    if (!plan || plan.status !== "DRAFT") return;
    if (!confirm("Are you sure you want to publish this learning plan? Enrolled users will be able to access the content.")) return;

    setPublishing(true);
    try {
      const response = await fetch(`/api/learning-plans/${planId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to publish learning plan");
      }

      const updatedPlan = await response.json();
      setPlan({ ...plan, status: "PUBLISHED" });
      alert("Learning plan published successfully!");
    } catch (error) {
      console.error("Error publishing learning plan:", error);
      alert(error instanceof Error ? error.message : "Failed to publish learning plan");
    } finally {
      setPublishing(false);
    }
  };

  // Show loading or redirect if no access
  if (loading || !hasViewAccess) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading learning plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return <div className="py-8 text-center text-gray-900 dark:text-gray-100">Learning plan not found</div>;
  }

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{plan.title}</h1>
      </div>

      {isLearner ? (
        // Learner view - single page, no tabs
        <div className="space-y-6">
          {/* Hero Section */}
          <Card className="overflow-hidden">
            <div className="relative">
              {plan.coverImage && (
                <div className="relative h-64 w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                  <img
                    src={plan.coverImage}
                    alt={plan.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}
              <div className={`p-6 ${plan.coverImage ? "relative -mt-16" : ""}`}>
                <div className={`${plan.coverImage ? "bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{plan.title}</h1>
                      {plan.shortDescription && (
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{plan.shortDescription}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {plan.estimatedTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{Math.floor(plan.estimatedTime / 60)}h {plan.estimatedTime % 60}m</span>
                          </div>
                        )}
                        {plan.difficultyLevel && (
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            <span>{plan.difficultyLevel}</span>
                          </div>
                        )}
                        {plan.courseCount > 0 && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{plan.courseCount} {plan.courseCount === 1 ? "Course" : "Courses"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {plan.selfEnrollment && !isEnrolled && (
                      <Button
                        onClick={handleSelfEnroll}
                        disabled={enrolling}
                        className="ml-4"
                      >
                        {enrolling ? "Enrolling..." : "Enroll Now"}
                      </Button>
                    )}
                    {isEnrolled && (
                      <Badge variant="success" className="ml-4">
                        {enrollmentStatus === "COMPLETED" ? "Completed" : "Enrolled"}
                      </Badge>
                    )}
                  </div>
                  {plan.description && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{plan.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Courses Section */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Courses in this Learning Plan</h2>
            {plan.courses.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No courses available in this learning plan yet.</p>
              </div>
            ) : (
              <div className="max-w-4xl">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Image</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead className="w-24">Time</TableHead>
                        <TableHead className="w-32">Difficulty</TableHead>
                        <TableHead className="w-32 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.courses.map((lpCourse, index) => (
                        <TableRow key={lpCourse.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => router.push(`/courses/${lpCourse.id}`)}>
                          <TableCell>
                            {lpCourse.coverImage ? (
                              <div className="w-20 aspect-video rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                <img
                                  src={lpCourse.coverImage}
                                  alt={lpCourse.title}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-20 aspect-video rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-white opacity-50" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                {lpCourse.title}
                              </div>
                              {lpCourse.shortDescription && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {lpCourse.shortDescription}
                                </div>
                              )}
                              <div className="mt-1">
                                <Badge variant="info" className="text-xs">
                                  Course {index + 1}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lpCourse.estimatedTime ? (
                              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(lpCourse.estimatedTime / 60)}h {lpCourse.estimatedTime % 60}m
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lpCourse.difficultyLevel ? (
                              <Badge variant="default" className="text-xs">
                                {lpCourse.difficultyLevel}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/courses/${lpCourse.id}`);
                              }}
                            >
                              <BookOpen className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        // Admin/Instructor/Creator view - with tabs
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            {canEdit && (
              <>
                <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </>
            )}
          </TabsList>

        <TabsContent value="details">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Learning Plan Details</h2>
            {canEdit ? (
              <form onSubmit={handleSubmitDetails(onDetailsSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Title *</label>
                  <Input
                    {...registerDetails("title")}
                    error={detailsErrors.title?.message}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Short Description</label>
                  <Input
                    {...registerDetails("shortDescription")}
                    error={detailsErrors.shortDescription?.message}
                    maxLength={130}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <Textarea
                    {...registerDetails("description")}
                    rows={6}
                  />
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Estimated Time (minutes)</label>
                  <Input
                    type="number"
                    {...registerDetails("estimatedTime", { valueAsNumber: true })}
                    error={detailsErrors.estimatedTime?.message}
                    placeholder="600 (optional)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Difficulty Level</label>
                  <Select
                    {...registerDetails("difficultyLevel")}
                  >
                    <option value="">Select difficulty (optional)</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cover Image
                </label>
                {watchDetails("coverImage") || coverImagePreview ? (
                  <div className="space-y-2">
                    <div className="relative w-full max-w-2xl aspect-video rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <img
                        src={coverImagePreview || watchDetails("coverImage") || ""}
                        alt="Cover preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCoverImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCoverImageUploadClick}
                      disabled={uploadingCover}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingCover ? "Uploading..." : "Change Image"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCoverImageUploadClick}
                    disabled={uploadingCover}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingCover ? "Uploading..." : "Upload Cover Image"}
                  </Button>
                )}
                <input
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverImageUpload}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Supported formats: JPG, PNG, GIF, WEBP. Max size: 5MB
                </p>
                <input type="hidden" {...registerDetails("coverImage")} />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">Title</label>
                  <p className="text-gray-900 dark:text-gray-100">{plan.title}</p>
                </div>

                {plan.shortDescription && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">Short Description</label>
                    <p className="text-gray-900 dark:text-gray-100">{plan.shortDescription}</p>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{plan.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {plan.estimatedTime && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Time</label>
                      <p className="text-gray-900 dark:text-gray-100">{plan.estimatedTime} minutes</p>
                    </div>
                  )}
                  {plan.difficultyLevel && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">Difficulty Level</label>
                      <p className="text-gray-900 dark:text-gray-100">{plan.difficultyLevel}</p>
                    </div>
                  )}
                </div>

                {plan.coverImage && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">Cover Image</label>
                    <div className="relative w-full max-w-2xl aspect-video rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <img
                        src={plan.coverImage}
                        alt="Cover"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Courses</h2>
              {canEdit && (
                <Button onClick={() => setAddCourseModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Course
                </Button>
              )}
            </div>

            {plan.courses.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No courses in this learning plan
              </div>
            ) : (
              <>
                {selectedCourseIds.size > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedCourseIds.size} course(s) selected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setBulkDeleteCoursesModalOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCourseIds(new Set())}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <button
                            onClick={() => handleSelectAllCourses(plan.courses.length > 0 && plan.courses.every((c) => selectedCourseIds.has(c.id)) ? false : true)}
                            className="flex items-center justify-center"
                          >
                            {plan.courses.length > 0 && plan.courses.every((c) => selectedCourseIds.has(c.id)) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>Image</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.courses.map((course, index) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <button
                              onClick={() => handleSelectCourse(course.id, !selectedCourseIds.has(course.id))}
                              className="flex items-center justify-center"
                            >
                              {selectedCourseIds.has(course.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            {course.coverImage ? (
                              <div className="w-24 h-14 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                <img
                                  src={course.coverImage}
                                  alt={course.title}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-24 h-14 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{course.title}</div>
                              {course.shortDescription && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                                  {course.shortDescription}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                              {course.order}
                            </div>
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            {course.estimatedTime ? (
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {course.estimatedTime} min
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {course.difficultyLevel ? (
                              <Badge variant="default" className="text-xs">
                                {course.difficultyLevel}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveCourse(course.id, "up")}
                                disabled={index === 0}
                                title="Move up"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveCourse(course.id, "down")}
                                disabled={index === plan.courses.length - 1}
                                title="Move down"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/courses/${course.id}`)}
                                title="View course"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCourse(course.id)}
                                title="Remove from plan"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Enrollments</h2>
              {isAdmin && (
                <Button onClick={() => setEnrollModalOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Enroll User
                </Button>
              )}
            </div>

            <div className="mb-4 flex gap-4 justify-end">
              <Select
                value={enrollmentsStatusFilter}
                onChange={(e) => {
                  setEnrollmentsStatusFilter(e.target.value);
                  setEnrollmentsPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-48"
              >
                <option value="">All Status</option>
                <option value="ENROLLED">Enrolled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="DROPPED">Dropped</option>
              </Select>
              <div className="w-64">
                <Input
                  placeholder="Search by name or email..."
                  value={enrollmentsSearch}
                  onChange={(e) => {
                    setEnrollmentsSearch(e.target.value);
                    setEnrollmentsPagination((p) => ({ ...p, page: 1 }));
                  }}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>

            {enrollmentsLoading ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : enrollments.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">No enrollments found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Enrolled At</TableHead>
                        <TableHead>Due Date</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {enrollment.user.avatar ? (
                                <img
                                  src={enrollment.user.avatar}
                                  alt={`${enrollment.user.firstName} ${enrollment.user.lastName}`}
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {enrollment.user.firstName[0]}
                                    {enrollment.user.lastName[0]}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {enrollment.user.firstName} {enrollment.user.lastName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {enrollment.user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {enrollment.user.isInstructor ? (
                              <Badge variant="primary">Instructor</Badge>
                            ) : (
                              <Badge variant="default">Learner</Badge>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${enrollment.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {Math.round(enrollment.progress || 0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {enrollment.dueDate
                              ? new Date(enrollment.dueDate).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setEnrollmentToDelete(enrollment);
                                  setDeleteEnrollmentModalOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {enrollmentsPagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((enrollmentsPagination.page - 1) * enrollmentsPagination.limit) + 1} to{" "}
                      {Math.min(enrollmentsPagination.page * enrollmentsPagination.limit, enrollmentsPagination.total)} of{" "}
                      {enrollmentsPagination.total} enrollments
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={enrollmentsPagination.page === 1}
                        onClick={() =>
                          setEnrollmentsPagination((p) => ({ ...p, page: p.page - 1 }))
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={enrollmentsPagination.page >= enrollmentsPagination.totalPages}
                        onClick={() =>
                          setEnrollmentsPagination((p) => ({ ...p, page: p.page + 1 }))
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Groups</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAddGroupModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Group
              </Button>
            </div>

            <TableToolbar
              search={{
                value: groupSearch,
                onChange: setGroupSearch,
                placeholder: "Search groups...",
              }}
            />

            {groupsLoading ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
            ) : groups.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">No groups assigned to this learning plan</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{group.name}</div>
                            {group.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{group.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{group.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(group.addedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <IconButton
                            icon={<Trash2 className="h-4 w-4" />}
                            label="Remove Group"
                            onClick={() => handleRemoveGroup(group.id)}
                            variant="ghost"
                            size="sm"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Learning Plan Settings</h2>
            <form onSubmit={handleSubmitSettings(onSettingsSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerSettings("publicAccess")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Public Access</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerSettings("selfEnrollment")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Allow Self-Enrollment</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerSettings("requiresApproval")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Requires Approval</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerSettings("hasCertificate")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Issue Certificate on Completion</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerSettings("hasBadge")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Issue Badge on Completion</span>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Max Enrollments</label>
                <Input
                  type="number"
                  {...registerSettings("maxEnrollments", { valueAsNumber: true })}
                  error={settingsErrors.maxEnrollments?.message}
                  placeholder="Unlimited if empty (optional)"
                />
              </div>

              {plan.status === "DRAFT" && (
                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {publishing ? "Publishing..." : "Publish Learning Plan"}
                  </Button>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Publishing will make this learning plan available to enrolled users.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
        </Tabs>
      )}

      {/* Add Course Modal */}
      <Modal
        isOpen={addCourseModalOpen}
        onClose={() => {
          setAddCourseModalOpen(false);
          setSelectedCourseIdsForAdd(new Set());
        }}
        title="Add Courses to Learning Plan"
      >
        <div className="space-y-4">
          <TableToolbar
            search={{
              value: coursesSearch,
              onChange: (value) => {
                setCoursesSearch(value);
                setCoursesPagination((p) => ({ ...p, page: 1 }));
              },
              placeholder: "Search courses...",
            }}
          />

          {selectedCourseIdsForAdd.size > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selectedCourseIdsForAdd.size} course(s) selected
              </div>
              <Button onClick={handleBulkAddCourses} variant="primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Selected
              </Button>
            </div>
          )}

          <div className="max-h-96 overflow-auto">
            <DataTable
              data={availableCourses}
              columns={{
                course: {
                  key: "course",
                  header: "Course",
                  render: (course) => (
                    <div className="flex items-center gap-3">
                      {course.coverImage ? (
                        <div className="w-16 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <img
                            src={course.coverImage}
                            alt={course.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{course.title}</div>
                        {course.shortDescription && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            {course.shortDescription}
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
                status: {
                  key: "status",
                  header: "Status",
                  render: (course) => (
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
                  ),
                },
                time: {
                  key: "time",
                  header: "Time",
                  render: (course) =>
                    course.estimatedTime ? (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {course.estimatedTime} min
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    ),
                },
                difficulty: {
                  key: "difficulty",
                  header: "Difficulty",
                  render: (course) =>
                    course.difficultyLevel ? (
                      <Badge variant="default" className="text-xs">
                        {course.difficultyLevel}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    ),
                },
              }}
              loading={coursesLoading}
              emptyMessage="No courses available"
              selectedIds={selectedCourseIdsForAdd}
              onSelectAll={handleSelectAllCoursesForAdd}
              onSelectItem={handleSelectCourseForAdd}
              getId={(course) => course.id}
            />
          </div>

          {coursesPagination.totalPages > 1 && (
            <TablePagination
              pagination={coursesPagination}
              onPageChange={(page) => setCoursesPagination((p) => ({ ...p, page }))}
              itemName="courses"
            />
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setAddCourseModalOpen(false);
                setSelectedCourseIdsForAdd(new Set());
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAddCourses} disabled={selectedCourseIdsForAdd.size === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add {selectedCourseIdsForAdd.size > 0 ? `${selectedCourseIdsForAdd.size} ` : ""}Course{selectedCourseIdsForAdd.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Enroll User Modal */}
      <UserSelectionModal
        isOpen={enrollModalOpen}
        onClose={() => {
          setEnrollModalOpen(false);
          setSelectedRole("LEARNER");
        }}
        onSelect={handleEnrollUsers}
        title="Enroll Users"
        actionLabel="Enroll"
        excludeUserIds={new Set(enrollments.map((e) => e.userId))}
        showRoleSelection={true}
        defaultRole={selectedRole}
        singleSelect={false}
      />

      {/* Delete Enrollment Modal */}
      <Modal
        isOpen={deleteEnrollmentModalOpen}
        onClose={() => {
          setDeleteEnrollmentModalOpen(false);
          setEnrollmentToDelete(null);
        }}
        title="Remove Enrollment"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to remove{" "}
            {enrollmentToDelete
              ? `${enrollmentToDelete.user.firstName} ${enrollmentToDelete.user.lastName}`
              : "this user"}{" "}
            from this learning plan? This will revoke their access.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteEnrollmentModalOpen(false);
                setEnrollmentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteEnrollment}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Courses Modal */}
      <Modal
        isOpen={bulkDeleteCoursesModalOpen}
        onClose={() => {
          setBulkDeleteCoursesModalOpen(false);
        }}
        title="Remove Selected Courses"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to remove {selectedCourseIds.size} selected course(s) from this learning plan? This will not delete the courses themselves, only remove them from this plan.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkDeleteCoursesModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDeleteCourses}>
              Remove {selectedCourseIds.size} Course(s)
            </Button>
          </div>
        </div>
      </Modal>

      <GroupSelectionModal
        isOpen={addGroupModalOpen}
        onClose={() => setAddGroupModalOpen(false)}
        onSelect={handleAddGroups}
        title="Add Groups to Learning Plan"
        actionLabel="Add"
        excludeGroupIds={new Set(groups.map((g) => g.id))}
        singleSelect={false}
      />
    </div>
  );
}
