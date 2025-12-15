"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Edit, Trash2, Save, Upload, X, Play, FileText, Presentation, Globe, Code, ChevronDown, ChevronUp, Lock, UserPlus, CheckSquare, Square, Search, ArrowUp, ArrowDown, ListChecks, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IconButton } from "@/components/ui/icon-button";
import { useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { ContentItemModal } from "@/components/content/content-item-modal";
import { PrerequisitesModal } from "@/components/content/prerequisites-modal";
import { VideoPlayerLazy } from "@/components/video/video-player-lazy";
import { PdfViewerLazy } from "@/components/pdf/pdf-viewer-lazy";
import { PPTViewerLazy } from "@/components/ppt/ppt-viewer-lazy";
import { UserSelectionModal } from "@/components/users/user-selection-modal";
import { GroupSelectionModal } from "@/components/groups/group-selection-modal";
import { cn } from "@/lib/utils/cn";
import { getIconContainerClasses, getIconContainerStyle } from "@/lib/utils/icon-container";

const updateCourseSchema = z.object({
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
  sequentialRequired: z.boolean().optional(),
  allowSkipping: z.boolean().optional(),
  coverImage: z.string().optional(),
});

type UpdateCourseForm = z.infer<typeof updateCourseSchema>;

interface Course {
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
  sequentialRequired: boolean;
  allowSkipping: boolean;
  createdBy: {
    id: string;
  };
  instructors: Array<{ id: string }>;
  enrollmentCount: number;
  contentItemCount: number;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  order: number;
  required: boolean;
  completed?: boolean;
  progress?: number;
  unlocked?: boolean;
  lastPage?: number | null;
  lastPosition?: number | null;
}

interface ExpandedContentItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  videoUrl: string | null;
  videoDuration: number | null;
  pdfUrl: string | null;
  pdfPages?: number | null;
  pptUrl: string | null;
  pptSlides?: number | null;
  htmlContent: string | null;
  externalUrl: string | null;
  completionThreshold: number | null;
  allowSeeking: boolean;
  unlocked: boolean;
  completed: boolean;
  lastPage?: number;
  lastPosition?: number;
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CourseEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const from = searchParams.get("from"); // "learning-plan" or "dashboard" or null
  const learningPlanId = searchParams.get("learningPlanId");
  const { user } = useAuthStore();
  
  // Course data
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [learningPlans, setLearningPlans] = useState<Array<{ id: string; title: string; status: string; coverImage: string | null; order: number }>>([]);
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
  } = useForm<UpdateCourseForm>({
    resolver: zodResolver(updateCourseSchema) as any,
  });

  // Training Material tab
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<ExpandedContentItem | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [editingContentItem, setEditingContentItem] = useState<any | null>(null);
  const [prerequisitesModalOpen, setPrerequisitesModalOpen] = useState(false);
  const [prerequisitesContentItemId, setPrerequisitesContentItemId] = useState<string | null>(null);
  const [prerequisitesContentItemTitle, setPrerequisitesContentItemTitle] = useState<string>("");

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
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [bulkDeleteEnrollmentModalOpen, setBulkDeleteEnrollmentModalOpen] = useState(false);
  const [bulkUpdateEnrollmentModalOpen, setBulkUpdateEnrollmentModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("");

  // Settings tab - form
  const {
    register: registerSettings,
    handleSubmit: handleSubmitSettings,
    formState: { errors: _settingsErrors },
    setValue: setSettingsValue,
  } = useForm<UpdateCourseForm>({
    resolver: zodResolver(updateCourseSchema) as any,
  });

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isAssignedInstructor = course?.instructors.some((i) => i.id === user?.id) || false;
  const isCreator = course?.createdBy.id === user?.id || false;
  const canEdit = isAdmin || isAssignedInstructor || isCreator;
  const isLearner = !isAdmin && !isAssignedInstructor && !isCreator && !user?.roles?.includes("INSTRUCTOR");

  // Check if user has view access (not just edit access)
  const [hasViewAccess, setHasViewAccess] = useState(false);

  // Check access permissions
  useEffect(() => {
    if (!loading && courseId) {
      fetch(`/api/courses/${courseId}`)
        .then((res) => {
          if (res.status === 403) {
            router.push("/courses");
          } else if (res.ok) {
            setHasViewAccess(true);
          }
        })
        .catch(() => {
          router.push("/courses");
        });
    }
  }, [loading, courseId, router]);

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      try {
        const [courseResponse, learningPlansResponse] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/learning-plans`),
        ]);

        if (!courseResponse.ok) {
          if (courseResponse.status === 403) {
            router.push("/courses");
            return;
          }
          throw new Error("Failed to fetch course");
        }

        const courseData = await courseResponse.json();
        setCourse(courseData);

        if (learningPlansResponse.ok) {
          const learningPlansData = await learningPlansResponse.json();
          setLearningPlans(learningPlansData.learningPlans || []);
        }

        // Set form values
        setDetailsValue("title", courseData.title);
        setDetailsValue("shortDescription", courseData.shortDescription || "");
        setDetailsValue("description", courseData.description || "");
        setDetailsValue("estimatedTime", courseData.estimatedTime);
        setDetailsValue("difficultyLevel", courseData.difficultyLevel);
        setDetailsValue("publicAccess", courseData.publicAccess);
        setDetailsValue("selfEnrollment", courseData.selfEnrollment);
        setDetailsValue("sequentialRequired", courseData.sequentialRequired);
        setDetailsValue("allowSkipping", courseData.allowSkipping);
        setDetailsValue("coverImage", courseData.coverImage || "");
        
        setSettingsValue("title", courseData.title);
        setSettingsValue("shortDescription", courseData.shortDescription || "");
        setSettingsValue("description", courseData.description || "");
        setSettingsValue("estimatedTime", courseData.estimatedTime);
        setSettingsValue("difficultyLevel", courseData.difficultyLevel);
        setSettingsValue("publicAccess", courseData.publicAccess);
        setSettingsValue("selfEnrollment", courseData.selfEnrollment);
        setSettingsValue("sequentialRequired", courseData.sequentialRequired);
        setSettingsValue("allowSkipping", courseData.allowSkipping);
        setSettingsValue("coverImage", courseData.coverImage || "");

        if (courseData.coverImage) {
          setCoverImagePreview(courseData.coverImage);
        }
      } catch (error) {
        console.error("Error fetching course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, setDetailsValue, setSettingsValue, router]);

  // Fetch content items - always fetch when page loads
  useEffect(() => {
    if (!courseId) return;
    
    const fetchContent = async () => {
      try {
        console.log("Fetching content items for course:", courseId);
        const response = await fetch(`/api/courses/${courseId}/content`);
        if (response.ok) {
          const data = await response.json();
          console.log("Content items fetched:", data.contentItems?.length || 0, "items");
          const itemsWithProgress = (data.contentItems || []).map((item: any) => ({
            ...item,
            unlocked: item.unlocked !== undefined ? item.unlocked : true,
            // Ensure progress and completed are properly set from API
            progress: item.progress ?? 0,
            completed: item.completed === true, // Explicit boolean check
          }));
          // Sort by order
          itemsWithProgress.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setContentItems(itemsWithProgress);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch content items:", response.status, response.statusText, errorData);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      }
    };
    
    fetchContent();
  }, [courseId]);

  // Fetch enrollments when Enrollments tab is active
  useEffect(() => {
    if (activeTab === "enrollments") {
      fetchEnrollments();
    }
  }, [activeTab, enrollmentsPagination.page, enrollmentsSearch, enrollmentsStatusFilter]);

  // Fetch groups when Groups tab is active
  useEffect(() => {
    if (activeTab === "groups") {
      fetchGroups();
    }
  }, [activeTab, groupSearch]);


  const fetchEnrollments = async () => {
    setEnrollmentsLoading(true);
    try {
      const params = new URLSearchParams({
        page: enrollmentsPagination.page.toString(),
        limit: enrollmentsPagination.limit.toString(),
      });
      if (enrollmentsSearch) params.append("search", enrollmentsSearch);
      if (enrollmentsStatusFilter) params.append("status", enrollmentsStatusFilter);

      const response = await fetch(`/api/courses/${courseId}/enrollments?${params}`);
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
    setGroupsLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/groups`);
      if (!response.ok) throw new Error("Failed to fetch groups");

      const data = await response.json();
      let filteredGroups = data.groups || [];

      if (groupSearch) {
        filteredGroups = filteredGroups.filter((group: { name: string; description: string | null }) =>
          group.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
          (group.description && group.description.toLowerCase().includes(groupSearch.toLowerCase()))
        );
      }

      setGroups(filteredGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleAddGroups = async (groupIds: string[]) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds }),
      });

      if (!response.ok) throw new Error("Failed to add groups");

      alert(`Successfully added ${groupIds.length} group(s) to course`);
      fetchGroups();
    } catch (error) {
      console.error("Error adding groups:", error);
      alert(error instanceof Error ? error.message : "Failed to add groups");
      throw error;
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to remove this group from the course?")) return;

    try {
      const response = await fetch(`/api/courses/${courseId}/groups?groupId=${groupId}`, {
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

  const onDetailsSubmit = async (data: UpdateCourseForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          estimatedTime: data.estimatedTime || null,
          difficultyLevel: data.difficultyLevel || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update course");

      const updatedCourse = await response.json();
      setCourse(updatedCourse);
      alert("Course updated successfully");
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  const onSettingsSubmit = async (data: UpdateCourseForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          estimatedTime: data.estimatedTime || null,
          difficultyLevel: data.difficultyLevel || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update course");

      const updatedCourse = await response.json();
      setCourse(updatedCourse);
      alert("Course settings updated successfully");
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  // Training Material tab handlers
  const getContentIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
      case "YOUTUBE":
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

  const handleAddContent = () => {
    setEditingContentItem(null);
    setContentModalOpen(true);
  };

  const handleEditContent = (item: ContentItem) => {
    // Fetch full content item details
    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/content/${item.id}`);
        if (response.ok) {
          const data = await response.json();
          setEditingContentItem(data);
          setContentModalOpen(true);
        }
      } catch (error) {
        console.error("Error fetching content item:", error);
      }
    };
    fetchItem();
  };

  const handleMoveContent = async (itemId: string, direction: "up" | "down") => {
    const currentIndex = contentItems.findIndex((item) => item.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= contentItems.length) return;

    const currentItem = contentItems[currentIndex];
    const targetItem = contentItems[newIndex];

    // Swap orders
    const tempOrder = currentItem.order;
    const newOrder = targetItem.order;

    try {
      // Update both items' orders
      const [currentResponse, targetResponse] = await Promise.all([
        fetch(`/api/content/${itemId}/order`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newOrder }),
        }),
        fetch(`/api/content/${targetItem.id}/order`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: tempOrder }),
        }),
      ]);

      if (currentResponse.ok && targetResponse.ok) {
        // Update local state
        const updatedItems = [...contentItems];
        updatedItems[currentIndex] = { ...currentItem, order: newOrder };
        updatedItems[newIndex] = { ...targetItem, order: tempOrder };
        // Re-sort by order
        updatedItems.sort((a, b) => (a.order || 0) - (b.order || 0));
        setContentItems(updatedItems);
      } else {
        throw new Error("Failed to update order");
      }
    } catch (error) {
      console.error("Error moving content item:", error);
      alert("Failed to reorder content item");
    }
  };

  const handleDeleteContent = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this content item?")) return;

    try {
      const response = await fetch(`/api/content/${itemId}`, { method: "DELETE" });
      if (response.ok) {
        setContentItems((items) => items.filter((i) => i.id !== itemId));
        if (expandedItemId === itemId) {
          setExpandedItemId(null);
          setExpandedContent(null);
        }
        // Refresh course to update contentItemCount
        const courseResponse = await fetch(`/api/courses/${courseId}`);
        if (courseResponse.ok) {
          const courseData = await courseResponse.json();
          setCourse(courseData);
        }
      }
    } catch (error) {
      alert("Failed to delete content item");
    }
  };

  const handleContentItemSubmit = async (data: any) => {
    try {
      if (editingContentItem) {
        // Update existing
        const response = await fetch(`/api/content/${editingContentItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to update content item");
      } else {
        // Create new
        const response = await fetch(`/api/courses/${courseId}/content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to create content item");
      }
      
      // Refresh content items
      const contentResponse = await fetch(`/api/courses/${courseId}/content`);
      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        const itemsWithProgress = contentData.contentItems.map((item: any) => ({
          ...item,
          unlocked: item.unlocked !== undefined ? item.unlocked : true,
        }));
        // Sort by order
        itemsWithProgress.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setContentItems(itemsWithProgress);
      }
      
      // Refresh course
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        setCourse(courseData);
      }
    } catch (error) {
      console.error("Error saving content item:", error);
      throw error;
    }
  };

  const handleContentItemClick = async (item: ContentItem) => {
    // For learners, check if content is unlocked
    if (isLearner && item.unlocked === false) {
      alert("This content is locked. Please complete the required prerequisites first.");
      return;
    }

    if (expandedItemId === item.id) {
      setExpandedItemId(null);
      setExpandedContent(null);
      return;
    }

    setExpandedItemId(item.id);
    setLoadingContent(true);

    try {
      // Fetch content item and progress in parallel
      const [contentResponse, progressResponse] = await Promise.all([
        fetch(`/api/content/${item.id}`),
        fetch(`/api/progress/content/${item.id}`).catch(() => null), // Progress is optional
      ]);

      if (!contentResponse.ok) throw new Error("Failed to fetch content item");

      const contentData = await contentResponse.json();
      
      // Get progress data if available
      let progressData = null;
      if (progressResponse && progressResponse.ok) {
        progressData = await progressResponse.json();
      }

      setExpandedContent({
        ...contentData,
        videoDuration: contentData.videoDuration || null,
        unlocked: item.unlocked !== undefined ? item.unlocked : true,
        completed: progressData?.completed ?? item.completed ?? false,
        lastPage: progressData?.lastPage ?? item.lastPage ?? undefined,
        lastPosition: progressData?.lastPosition ?? item.lastPosition ?? undefined,
      });
    } catch (error) {
      console.error("Error fetching content:", error);
      alert("Failed to load content. Please try again.");
      setExpandedItemId(null);
    } finally {
      setLoadingContent(false);
    }
  };

  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<{ progress?: number; completed?: boolean } | null>(null);

  const handleProgressUpdate = async (progressOrNumber?: number | { watchTime?: number; totalDuration?: number; lastPosition?: number; completed?: boolean }, completed?: boolean) => {
    // Handle both video progress (object) and content progress (number, completed)
    let newProgress: number | undefined;
    let isCompleted: boolean | undefined;
    
    if (typeof progressOrNumber === 'object' && progressOrNumber !== null) {
      // Video progress format
      const videoProgress = progressOrNumber as { watchTime?: number; totalDuration?: number; completed?: boolean };
      newProgress = videoProgress.totalDuration && videoProgress.totalDuration > 0 && videoProgress.watchTime !== undefined
        ? (videoProgress.watchTime / videoProgress.totalDuration) * 100
        : undefined;
      isCompleted = videoProgress.completed;
    } else {
      // Content progress format (PDF/PPT)
      newProgress = progressOrNumber;
      isCompleted = completed;
    }
    // Clear any pending update
    if (progressUpdateTimeoutRef.current) {
      clearTimeout(progressUpdateTimeoutRef.current);
    }

    // Check if completion status changed (important update)
    const completionChanged = lastProgressRef.current?.completed !== isCompleted;
    const significantProgressChange = 
      lastProgressRef.current?.progress !== undefined &&
      newProgress !== undefined &&
      Math.abs(lastProgressRef.current.progress - newProgress) >= 0.1; // 10% change

    // Update last progress
    lastProgressRef.current = { progress: newProgress, completed: isCompleted };

    // If completion status changed, update immediately
    if (completionChanged || (isCompleted === true)) {
      const fetchContent = async () => {
        try {
          const contentResponse = await fetch(`/api/courses/${courseId}/content`);
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const itemsWithProgress = contentData.contentItems.map((item: any) => ({
              ...item,
              unlocked: item.unlocked !== undefined ? item.unlocked : true,
              progress: item.progress ?? 0,
              completed: item.completed === true,
              lastPage: item.lastPage || null,
              lastPosition: item.lastPosition || null,
            }));
            itemsWithProgress.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setContentItems(itemsWithProgress);
            
            if (expandedContent && expandedItemId) {
              try {
                const progressResponse = await fetch(`/api/progress/content/${expandedItemId}`);
                if (progressResponse.ok) {
                  const progressData = await progressResponse.json();
                  setExpandedContent((prev) => prev ? {
                    ...prev,
                    completed: progressData.completed ?? prev.completed,
                    lastPage: progressData.lastPage ?? prev.lastPage,
                    lastPosition: progressData.lastPosition ?? prev.lastPosition,
                  } : null);
                }
              } catch (error) {
                console.error("Error fetching updated progress:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error refreshing content:", error);
        }
      };
      fetchContent();
      return;
    }

    // For other updates, debounce to avoid spam
    progressUpdateTimeoutRef.current = setTimeout(async () => {
      // Only refresh if there was a significant change
      if (significantProgressChange) {
        try {
          const contentResponse = await fetch(`/api/courses/${courseId}/content`);
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const itemsWithProgress = contentData.contentItems.map((item: any) => ({
              ...item,
              unlocked: item.unlocked !== undefined ? item.unlocked : true,
              progress: item.progress ?? 0,
              completed: item.completed === true,
              lastPage: item.lastPage || null,
              lastPosition: item.lastPosition || null,
            }));
            itemsWithProgress.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setContentItems(itemsWithProgress);
          }
        } catch (error) {
          console.error("Error refreshing content:", error);
        }
      }
      
      // Update expanded content item progress (lightweight)
      if (expandedContent && expandedItemId) {
        try {
          const progressResponse = await fetch(`/api/progress/content/${expandedItemId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setExpandedContent((prev) => prev ? {
              ...prev,
              completed: progressData.completed ?? prev.completed,
              lastPage: progressData.lastPage ?? prev.lastPage,
              lastPosition: progressData.lastPosition ?? prev.lastPosition,
            } : null);
          }
        } catch (error) {
          console.error("Error fetching updated progress:", error);
        }
      }
    }, 2000); // Debounce for 2 seconds
  };

  // Enrollments tab handlers
  const handleSelectAllEnrollments = (checked: boolean) => {
    if (checked) {
      setSelectedEnrollmentIds(new Set(enrollments.map((e) => e.id)));
    } else {
      setSelectedEnrollmentIds(new Set());
    }
  };

  const handleSelectEnrollment = (enrollmentId: string, checked: boolean) => {
    const newSelected = new Set(selectedEnrollmentIds);
    if (checked) {
      newSelected.add(enrollmentId);
    } else {
      newSelected.delete(enrollmentId);
    }
    setSelectedEnrollmentIds(newSelected);
  };

  const handleEnrollUsers = async (userIds: string[], role?: "LEARNER" | "INSTRUCTOR") => {
    try {
      const response = await fetch(`/api/courses/${courseId}/enrollments/bulk`, {
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

  const handleBulkDeleteEnrollments = async () => {
    if (selectedEnrollmentIds.size === 0) return;

    try {
      const response = await fetch("/api/enrollments/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentIds: Array.from(selectedEnrollmentIds),
        }),
      });

      if (!response.ok) throw new Error("Failed to delete enrollments");

      const data = await response.json();
      alert(`Deleted ${data.deleted} enrollment(s), ${data.failed} failed`);
      setBulkDeleteEnrollmentModalOpen(false);
      setSelectedEnrollmentIds(new Set());
      fetchEnrollments();
    } catch (error) {
      console.error("Error deleting enrollments:", error);
      alert("Failed to delete enrollments");
    }
  };

  const handleBulkUpdateEnrollments = async () => {
    if (selectedEnrollmentIds.size === 0 || !bulkStatus) return;

    try {
      const response = await fetch("/api/enrollments/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentIds: Array.from(selectedEnrollmentIds),
          status: bulkStatus,
        }),
      });

      if (!response.ok) throw new Error("Failed to update enrollments");

      const data = await response.json();
      alert(`Updated ${data.updated} enrollment(s), ${data.failed} failed`);
      setBulkUpdateEnrollmentModalOpen(false);
      setBulkStatus("");
      setSelectedEnrollmentIds(new Set());
      fetchEnrollments();
    } catch (error) {
      console.error("Error updating enrollments:", error);
      alert("Failed to update enrollments");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENROLLED":
        return <Badge variant="default">Enrolled</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="info">In Progress</Badge>;
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

  if (loading || !hasViewAccess) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="py-8 text-center text-gray-900 dark:text-gray-100">Course not found</div>;
  }

  const isAllEnrollmentsSelected = enrollments.length > 0 && enrollments.every((e) => selectedEnrollmentIds.has(e.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (from === "learning-plan" && learningPlanId) {
              router.push(`/learning-plans/${learningPlanId}`);
            } else if (from === "dashboard") {
              router.push("/dashboard/learner");
            } else {
              router.push("/courses");
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
      </div>

      {isLearner ? (
        // Learner view - show training material tab only
        <Tabs defaultValue="training-material" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="training-material">Training Material</TabsTrigger>
          </TabsList>

        <TabsContent value="training-material">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Training Material</h2>
              {canEdit && (
                <Button onClick={handleAddContent}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Content
                </Button>
              )}
            </div>

            {contentItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No content items yet
              </div>
            ) : (
              <div className="space-y-4">
                {contentItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border overflow-hidden"
                    >
                      <div
                        className={cn(
                          "flex items-center justify-between p-4 transition-colors",
                          isExpanded 
                            ? "bg-blue-50 dark:bg-blue-900/20" 
                            : "hover:bg-gray-50 dark:hover:bg-gray-800",
                          isLearner && item.unlocked === false
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        )}
                        onClick={() => handleContentItemClick(item)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={getIconContainerClasses("primary")}
                            style={getIconContainerStyle("primary")}
                          >
                            {getContentIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              {item.title}
                              {isLearner && item.unlocked === false && (
                                <Lock className="h-4 w-4 text-gray-400" />
                              )}
                              {item.completed && (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Badge variant="info" className="text-xs">
                                {item.type}
                              </Badge>
                              {item.required && (
                                <Badge variant="warning" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              {isLearner && item.unlocked === false && (
                                <Badge variant="default" className="text-xs">
                                  Locked
                                </Badge>
                              )}
                              {(() => {
                                // Check completion first (most reliable)
                                if (item.completed === true) {
                                  return <Badge variant="success" className="text-xs flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Complete
                                  </Badge>;
                                } else if (item.progress !== undefined && item.progress > 0) {
                                  return <Badge variant="info" className="text-xs">In Progress</Badge>;
                                } else {
                                  return <Badge variant="default" className="text-xs">Not Started</Badge>;
                                }
                              })()}
                              {item.progress !== undefined && item.progress > 0 && !item.completed && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  {Math.round(item.progress)}% complete
                                </span>
                              )}
                              <span>Order: {item.order}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveContent(item.id, "up");
                                }}
                                disabled={contentItems.findIndex((i) => i.id === item.id) === 0}
                                title="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveContent(item.id, "down");
                                }}
                                disabled={contentItems.findIndex((i) => i.id === item.id) === contentItems.length - 1}
                                title="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrerequisitesContentItemId(item.id);
                                  setPrerequisitesContentItemTitle(item.title);
                                  setPrerequisitesModalOpen(true);
                                }}
                                title="Set prerequisites"
                              >
                                <ListChecks className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditContent(item);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContent(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <div className="text-gray-400">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                          {loadingContent ? (
                            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                              Loading content...
                            </div>
                          ) : expandedContent ? (
                            <div className="space-y-4">
                              {expandedContent.description && (
                                <p className="text-gray-700 dark:text-gray-300">{expandedContent.description}</p>
                              )}
                              
                              {expandedContent.type === "VIDEO" && expandedContent.videoUrl && (
                                <VideoPlayerLazy
                                  contentItemId={expandedContent.id}
                                  videoUrl={expandedContent.videoUrl}
                                  videoDuration={expandedContent.videoDuration || undefined}
                                  completionThreshold={expandedContent.completionThreshold || 0.8}
                                  allowSeeking={expandedContent.allowSeeking}
                                  onProgressUpdate={handleProgressUpdate}
                                />
                              )}

                              {expandedContent.type === "PDF" && expandedContent.pdfUrl && (
                                <PdfViewerLazy 
                                  fileUrl={expandedContent.pdfUrl}
                                  contentItemId={expandedContent.id}
                                  totalPages={expandedContent.pdfPages || undefined}
                                  completionThreshold={expandedContent.completionThreshold || 0.8}
                                  onProgressUpdate={handleProgressUpdate}
                                  initialPage={expandedContent.lastPage || undefined}
                                />
                              )}

                              {expandedContent.type === "PPT" && expandedContent.pptUrl && (
                                <PPTViewerLazy 
                                  fileUrl={expandedContent.pptUrl}
                                  contentItemId={expandedContent.id}
                                  totalPages={expandedContent.pptSlides || undefined}
                                  completionThreshold={expandedContent.completionThreshold || 0.8}
                                  onProgressUpdate={handleProgressUpdate}
                                  initialPage={expandedContent.lastPage || undefined}
                                />
                              )}

                              {expandedContent.type === "HTML" && expandedContent.htmlContent && (
                                <div
                                  className="prose max-w-none"
                                  dangerouslySetInnerHTML={{ __html: expandedContent.htmlContent }}
                                />
                              )}

                              {expandedContent.type === "EXTERNAL" && expandedContent.externalUrl && (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                    External content link.
                                  </p>
                                  <Button
                                    onClick={() => window.open(expandedContent.externalUrl!, "_blank")}
                                  >
                                    Open External Link
                                  </Button>
                                </div>
                              )}

                              {expandedContent.type === "TEST" && (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                    Test content. Click to take the test.
                                  </p>
                                  <Button
                                    onClick={() =>
                                      router.push(`/courses/${courseId}/tests/${expandedContent.id}`)
                                    }
                                  >
                                    Take Test
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                              Failed to load content
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
        </Tabs>
      ) : (
        // Admin/Instructor/Creator view - with all tabs
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="training-material">Training Material</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

        <TabsContent value="details">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Course Details</h2>
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
                    placeholder="120 (optional)"
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

              {learningPlans.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Part of Learning Plans
                  </label>
                  <div className="space-y-2">
                    {learningPlans.map((lp) => (
                      <div
                        key={lp.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => router.push(`/learning-plans/${lp.id}?tab=courses`)}
                      >
                        {lp.coverImage && (
                          <div className="w-16 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            <img
                              src={lp.coverImage}
                              alt={lp.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {lp.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Order: {lp.order} • {lp.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="training-material">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Training Material</h2>
              <Button onClick={handleAddContent}>
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </Button>
            </div>

            {contentItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No content items yet
              </div>
            ) : (
              <div className="space-y-4">
                {contentItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border overflow-hidden"
                    >
                      <div
                        className={cn(
                          "flex items-center justify-between p-4 transition-colors",
                          isExpanded 
                            ? "bg-blue-50 dark:bg-blue-900/20" 
                            : "hover:bg-gray-50 dark:hover:bg-gray-800",
                          isLearner && item.unlocked === false
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        )}
                        onClick={() => handleContentItemClick(item)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={getIconContainerClasses("primary")}
                            style={getIconContainerStyle("primary")}
                          >
                            {getContentIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              {item.title}
                              {isLearner && item.unlocked === false && (
                                <Lock className="h-4 w-4 text-gray-400" />
                              )}
                              {item.completed && (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Badge variant="info" className="text-xs">
                                {item.type}
                              </Badge>
                              {item.required && (
                                <Badge variant="warning" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              {isLearner && item.unlocked === false && (
                                <Badge variant="default" className="text-xs">
                                  Locked
                                </Badge>
                              )}
                              {(() => {
                                // Check completion first (most reliable)
                                if (item.completed === true) {
                                  return <Badge variant="success" className="text-xs flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Complete
                                  </Badge>;
                                } else if (item.progress !== undefined && item.progress > 0) {
                                  return <Badge variant="info" className="text-xs">In Progress</Badge>;
                                } else {
                                  return <Badge variant="default" className="text-xs">Not Started</Badge>;
                                }
                              })()}
                              {item.progress !== undefined && item.progress > 0 && !item.completed && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  {Math.round(item.progress)}% complete
                                </span>
                              )}
                              <span>Order: {item.order}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveContent(item.id, "up");
                                }}
                                disabled={contentItems.findIndex((i) => i.id === item.id) === 0}
                                title="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveContent(item.id, "down");
                                }}
                                disabled={contentItems.findIndex((i) => i.id === item.id) === contentItems.length - 1}
                                title="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrerequisitesContentItemId(item.id);
                                  setPrerequisitesContentItemTitle(item.title);
                                  setPrerequisitesModalOpen(true);
                                }}
                                title="Set prerequisites"
                              >
                                <ListChecks className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditContent(item);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContent(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <div className="text-gray-400">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                          {loadingContent ? (
                            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                              Loading content...
                            </div>
                          ) : expandedContent ? (
                            <div className="space-y-4">
                              {expandedContent.description && (
                                <p className="text-gray-700 dark:text-gray-300">{expandedContent.description}</p>
                              )}
                              
                              {expandedContent.type === "VIDEO" && expandedContent.videoUrl && (
                                <VideoPlayerLazy
                                  contentItemId={expandedContent.id}
                                  videoUrl={expandedContent.videoUrl}
                                  videoDuration={expandedContent.videoDuration || undefined}
                                  completionThreshold={expandedContent.completionThreshold || 0.8}
                                  allowSeeking={expandedContent.allowSeeking}
                                  onProgressUpdate={handleProgressUpdate}
                                />
                              )}

                              {expandedContent.type === "PDF" && expandedContent.pdfUrl && (
                                <PdfViewerLazy 
                                  fileUrl={expandedContent.pdfUrl}
                                  contentItemId={expandedContent.id}
                                  totalPages={expandedContent.pdfPages || undefined}
                                  completionThreshold={expandedContent.completionThreshold || 0.8}
                                  onProgressUpdate={handleProgressUpdate}
                                  initialPage={expandedContent.lastPage || undefined}
                                />
                              )}

                              {expandedContent.type === "PPT" && expandedContent.pptUrl && (
                                <PPTViewerLazy 
                                  fileUrl={expandedContent.pptUrl}
                                  contentItemId={expandedContent.id}
                                  totalPages={expandedContent.pptSlides || undefined}
                                  completionThreshold={expandedContent.completionThreshold || 0.8}
                                  onProgressUpdate={handleProgressUpdate}
                                  initialPage={expandedContent.lastPage || undefined}
                                />
                              )}

                              {expandedContent.type === "HTML" && expandedContent.htmlContent && (
                                <div
                                  className="prose max-w-none"
                                  dangerouslySetInnerHTML={{ __html: expandedContent.htmlContent }}
                                />
                              )}

                              {expandedContent.type === "EXTERNAL" && expandedContent.externalUrl && (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                    External content link.
                                  </p>
                                  <Button
                                    onClick={() => window.open(expandedContent.externalUrl!, "_blank")}
                                  >
                                    Open External Link
                                  </Button>
                                </div>
                              )}

                              {expandedContent.type === "TEST" && (
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                    Test content. Click to take the test.
                                  </p>
                                  <Button
                                    onClick={() =>
                                      router.push(`/courses/${courseId}/tests/${expandedContent.id}`)
                                    }
                                  >
                                    Take Test
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                              Failed to load content
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                {selectedEnrollmentIds.size > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedEnrollmentIds.size} enrollment(s) selected
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setBulkUpdateEnrollmentModalOpen(true)}
                      >
                        Change Status
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setBulkDeleteEnrollmentModalOpen(true)}
                      >
                        Remove Selected
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEnrollmentIds(new Set())}
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
                            onClick={() => handleSelectAllEnrollments(!isAllEnrollmentsSelected)}
                            className="flex items-center justify-center"
                          >
                            {isAllEnrollmentsSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </TableHead>
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
                            <button
                              onClick={() => handleSelectEnrollment(enrollment.id, !selectedEnrollmentIds.has(enrollment.id))}
                              className="flex items-center justify-center"
                            >
                              {selectedEnrollmentIds.has(enrollment.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </TableCell>
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
                              <Badge variant="info">Instructor</Badge>
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
              <h2 className="text-xl font-semibold">Groups</h2>
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
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : groups.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No groups assigned to this course</div>
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
                            <div className="font-medium">{group.name}</div>
                            {group.description && (
                              <div className="text-sm text-gray-500">{group.description}</div>
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
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Course Settings</h2>
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
                    {...registerSettings("sequentialRequired")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Sequential Content Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerSettings("allowSkipping")}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Allow Skipping Content</span>
                </label>
              </div>

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

      {/* Content Item Modal */}
      <ContentItemModal
        isOpen={contentModalOpen}
        onClose={() => {
          setContentModalOpen(false);
          setEditingContentItem(null);
        }}
        onSubmit={handleContentItemSubmit}
        courseId={courseId}
        existingItem={editingContentItem}
        nextOrder={contentItems.length}
      />

      {prerequisitesContentItemId && (
        <PrerequisitesModal
          isOpen={prerequisitesModalOpen}
          onClose={() => {
            setPrerequisitesModalOpen(false);
            setPrerequisitesContentItemId(null);
            setPrerequisitesContentItemTitle("");
          }}
          contentItemId={prerequisitesContentItemId}
          courseId={courseId}
          currentTitle={prerequisitesContentItemTitle}
        />
      )}

      {/* Enroll User Modal */}
      <GroupSelectionModal
        isOpen={addGroupModalOpen}
        onClose={() => setAddGroupModalOpen(false)}
        onSelect={handleAddGroups}
        title="Add Groups to Course"
        actionLabel="Add"
        excludeGroupIds={new Set(groups.map((g) => g.id))}
        singleSelect={false}
      />

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
            from this course? This will revoke their access.
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

      {/* Bulk Delete Enrollments Modal */}
      <Modal
        isOpen={bulkDeleteEnrollmentModalOpen}
        onClose={() => {
          setBulkDeleteEnrollmentModalOpen(false);
        }}
        title="Remove Selected Enrollments"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to remove {selectedEnrollmentIds.size} selected enrollment(s)? This will revoke their access to this course.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkDeleteEnrollmentModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDeleteEnrollments}>
              Remove {selectedEnrollmentIds.size} Enrollment(s)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Update Enrollments Modal */}
      <Modal
        isOpen={bulkUpdateEnrollmentModalOpen}
        onClose={() => {
          setBulkUpdateEnrollmentModalOpen(false);
          setBulkStatus("");
        }}
        title="Change Status for Selected Enrollments"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will update the status for {selectedEnrollmentIds.size} selected enrollment(s).
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Status
            </label>
            <Select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full"
            >
              <option value="">Select a status...</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="DROPPED">Dropped</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setBulkUpdateEnrollmentModalOpen(false);
                setBulkStatus("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkUpdateEnrollments} disabled={!bulkStatus}>
              Update {selectedEnrollmentIds.size} Enrollment(s)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
