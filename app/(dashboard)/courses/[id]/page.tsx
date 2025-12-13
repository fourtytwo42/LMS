"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, Play, FileText, Presentation, Globe, Code, ChevronDown, ChevronUp, Lock, BarChart3, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { VideoPlayerLazy } from "@/components/video/video-player-lazy";
import { PdfViewerLazy } from "@/components/pdf/pdf-viewer-lazy";
import { cn } from "@/lib/utils/cn";
import { getIconContainerClasses, getIconContainerStyle } from "@/lib/utils/icon-container";

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
  unlocked?: boolean;
}

interface ExpandedContentItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  videoUrl: string | null;
  videoDuration: number | null;
  pdfUrl: string | null;
  pptUrl: string | null;
  htmlContent: string | null;
  externalUrl: string | null;
  completionThreshold: number | null;
  allowSeeking: boolean;
  unlocked: boolean;
  completed: boolean;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<ExpandedContentItem | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [userEnrollment, setUserEnrollment] = useState<{ id: string; status: string } | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);

  const isAdmin = user?.roles?.includes("ADMIN") || false;
  const isInstructor = user?.roles?.includes("INSTRUCTOR") || false;
  const canEdit = isAdmin || isInstructor;
  const isLearner = user?.roles?.includes("LEARNER") || false;

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const [courseResponse, contentResponse, enrollmentsResponse] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/content`),
          user ? fetch(`/api/enrollments?courseId=${courseId}&userId=${user.id}`) : Promise.resolve(null),
        ]);

        if (!courseResponse.ok) throw new Error("Failed to fetch course");
        if (!contentResponse.ok) throw new Error("Failed to fetch content");

        const courseData = await courseResponse.json();
        const contentData = await contentResponse.json();

        setCourse(courseData);
        // Map content items with unlocked status from progress
        const itemsWithProgress = contentData.contentItems.map((item: any) => ({
          ...item,
          unlocked: item.unlocked !== undefined ? item.unlocked : true, // Default to unlocked if not specified
        }));
        setContentItems(itemsWithProgress);

        // Check if user is enrolled
        if (enrollmentsResponse && enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json();
          if (enrollmentsData.enrollments && enrollmentsData.enrollments.length > 0) {
            setUserEnrollment(enrollmentsData.enrollments[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, user]);

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

  const handleUnenroll = async () => {
    if (!userEnrollment || !confirm("Are you sure you want to unenroll from this course?")) {
      return;
    }

    setUnenrolling(true);
    try {
      const response = await fetch(`/api/enrollments/self/${userEnrollment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unenroll");
      }

      setUserEnrollment(null);
      alert("Successfully unenrolled from course");
      router.push("/courses");
    } catch (error: any) {
      console.error("Error unenrolling:", error);
      alert(error.message || "Failed to unenroll");
    } finally {
      setUnenrolling(false);
    }
  };

  const handleContentItemClick = async (item: ContentItem) => {
    // If clicking the same item, collapse it
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
      setExpandedContent(null);
      return;
    }

    // Check if content is unlocked
    if (item.unlocked === false) {
      // Find previous incomplete content
      const previousItems = contentItems.filter((i) => i.order < item.order);
      const incompleteItem = previousItems.find((i) => !i.completed && i.required);
      
      if (incompleteItem) {
        alert(`Please complete "${incompleteItem.title}" before accessing this content.`);
      } else {
        alert("This content is locked. Please complete the previous required content first.");
      }
      return;
    }

    // Expand the item and fetch full content
    setExpandedItemId(item.id);
    setLoadingContent(true);

    try {
      // Fetch full content item details
      const contentResponse = await fetch(`/api/content/${item.id}`);
      if (!contentResponse.ok) {
        throw new Error("Failed to fetch content item");
      }

      const contentData = await contentResponse.json();
      
      // Get progress to check unlocked status
      const progressResponse = await fetch(`/api/progress/course/${courseId}`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        const itemProgress = progressData.contentItems.find(
          (p: any) => p.id === item.id
        );

        setExpandedContent({
          ...contentData,
          videoDuration: contentData.videoDuration || null,
          unlocked: itemProgress?.unlocked !== false,
          completed: itemProgress?.completed || false,
        });
      } else {
        setExpandedContent({
          ...contentData,
          videoDuration: contentData.videoDuration || null,
          unlocked: true,
          completed: false,
        });
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      alert("Failed to load content. Please try again.");
      setExpandedItemId(null);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleProgressUpdate = () => {
    // Refresh course content to update progress
    const fetchContent = async () => {
      try {
        const contentResponse = await fetch(`/api/courses/${courseId}/content`);
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          const itemsWithProgress = contentData.contentItems.map((item: any) => ({
            ...item,
            unlocked: item.unlocked !== undefined ? item.unlocked : true,
          }));
          setContentItems(itemsWithProgress);
        }
      } catch (error) {
        console.error("Error refreshing content:", error);
      }
    };
    fetchContent();
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-900 dark:text-gray-100">Loading...</div>;
  }

  if (!course) {
    return <div className="py-8 text-center text-gray-900 dark:text-gray-100">Course not found</div>;
  }

  return (
    <div className="space-y-8 sm:space-y-10 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/courses")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/courses/${courseId}/enrollments`)}
              >
                <Users className="mr-2 h-4 w-4" />
                Enrollments
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/courses/${courseId}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/analytics/course/${courseId}`)}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </>
          )}
          {isLearner && userEnrollment && !canEdit && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleUnenroll}
              disabled={unenrolling}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {unenrolling ? "Unenrolling..." : "Unenroll"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          {course.coverImage ? (
            <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              <img
                src={course.coverImage}
                alt={course.title}
                className="w-full h-full object-contain"
              />
            </div>
          ) : null}
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
            <p className="mb-4 text-lg text-gray-700 dark:text-gray-300">
              {course.shortDescription}
            </p>
          )}
          {course.description && (
            <div className="prose max-w-none">
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {course.description}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Course Info</h2>
          <div className="space-y-4">
            {course.estimatedTime && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Estimated Time</div>
                <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {course.estimatedTime} minutes
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Enrollments</div>
              <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {course.enrollmentCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Content Items</div>
              <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {course.contentItemCount}
              </div>
            </div>
            {course.rating && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Rating</div>
                <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {course.rating.toFixed(1)} ({course.reviewCount} reviews)
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Settings</div>
              <div className="mt-1 space-y-1 text-sm">
                {course.publicAccess && (
                  <div className="text-green-600 dark:text-green-400">✓ Public Access</div>
                )}
                {course.selfEnrollment && (
                  <div className="text-green-600 dark:text-green-400">✓ Self-Enrollment</div>
                )}
                {course.sequentialRequired && (
                  <div className="text-blue-600 dark:text-blue-400">Sequential Required</div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Content Items</h2>
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
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No content items yet
          </div>
        ) : (
          <div className="space-y-4">
            {contentItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const isLocked = item.unlocked === false;
              
              return (
                <div
                  key={item.id}
                  className="rounded-lg border overflow-hidden"
                >
                  <div
                    className={cn(
                      "flex items-center justify-between p-4 cursor-pointer transition-colors",
                      isExpanded 
                        ? "bg-blue-50 dark:bg-blue-900/20" 
                        : "hover:bg-gray-50 dark:hover:bg-gray-800",
                      isLocked && "opacity-60"
                    )}
                    onClick={() => !canEdit && handleContentItemClick(item)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={getIconContainerClasses(isLocked ? "locked" : "primary")}
                        style={getIconContainerStyle(isLocked ? "locked" : "primary")}
                      >
                        {isLocked ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          getContentIcon(item.type)
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2 text-gray-900 dark:text-gray-100">
                          {item.title}
                          {isLocked && (
                            <Badge variant="default" className="text-xs">
                              Locked
                            </Badge>
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
                          <span>Order: {item.order}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.progress !== undefined && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {Math.round(item.progress * 100)}%
                        </div>
                      )}
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/courses/${courseId}/content/${item.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
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
                                    if (expandedItemId === item.id) {
                                      setExpandedItemId(null);
                                      setExpandedContent(null);
                                    }
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
                        <div className="text-gray-400">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Content */}
                  {isExpanded && !canEdit && (
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
                            <PdfViewerLazy fileUrl={expandedContent.pdfUrl} />
                          )}

                          {expandedContent.type === "PPT" && expandedContent.pptUrl && (
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                PowerPoint presentation. Click to download or view.
                              </p>
                              <Button
                                onClick={() => window.open(expandedContent.pptUrl!, "_blank")}
                              >
                                Open Presentation
                              </Button>
                            </div>
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
    </div>
  );
}

