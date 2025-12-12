"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoPlayerLazy } from "@/components/video/video-player-lazy";
import { PdfViewerLazy } from "@/components/pdf/pdf-viewer-lazy";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  description: string | null;
  order: number;
  videoUrl: string | null;
  pdfUrl: string | null;
  externalUrl: string | null;
  htmlContent: string | null;
  completionThreshold: number | null;
  allowSeeking: boolean;
  unlocked: boolean;
  completed: boolean;
}

export default function ContentItemPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const contentItemId = params.contentItemId as string;
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContentItem = async () => {
      try {
        // First, get course progress to check if content is unlocked
        const progressResponse = await fetch(`/api/progress/course/${courseId}`);
        if (!progressResponse.ok) {
          throw new Error("Failed to fetch course progress");
        }

        const progressData = await progressResponse.json();
        const itemProgress = progressData.contentItems.find(
          (item: any) => item.id === contentItemId
        );

        if (!itemProgress) {
          throw new Error("Content item not found in course");
        }

        // Get full content item details
        const contentResponse = await fetch(`/api/courses/${courseId}/content/${contentItemId}`);
        if (!contentResponse.ok) {
          throw new Error("Failed to fetch content item");
        }

        const contentData = await contentResponse.json();
        setContentItem({
          ...contentData.contentItem,
          unlocked: itemProgress.unlocked,
          completed: itemProgress.completed,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchContentItem();
  }, [courseId, contentItemId]);

  const handleProgressUpdate = () => {
    // Refresh course progress to update unlocked status
    router.refresh();
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center">Loading content...</div>
      </div>
    );
  }

  if (error || !contentItem) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center text-red-600">{error || "Content not found"}</div>
        <Button
          variant="secondary"
          onClick={() => router.push(`/courses/${courseId}`)}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>
      </div>
    );
  }

  if (!contentItem.unlocked) {
    return (
      <div className="w-full space-y-6">
        <Card className="text-center">
          <Lock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Content Locked</h2>
          <p className="text-gray-600 mb-4">
            Please complete the previous content items to unlock this content.
          </p>
          <Button
            variant="secondary"
            onClick={() => router.push(`/courses/${courseId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push(`/courses/${courseId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>
      </div>

      <Card className="p-6">
        <h1 className="mb-4 text-3xl font-bold">{contentItem.title}</h1>
        {contentItem.description && (
          <p className="mb-6 text-gray-600">{contentItem.description}</p>
        )}

        <div className="mt-6">
          {contentItem.type === "VIDEO" && contentItem.videoUrl && (
            <VideoPlayerLazy
              contentItemId={contentItem.id}
              videoUrl={contentItem.videoUrl}
              completionThreshold={contentItem.completionThreshold || 0.8}
              allowSeeking={contentItem.allowSeeking}
              onProgressUpdate={handleProgressUpdate}
            />
          )}

          {contentItem.type === "PDF" && contentItem.pdfUrl && (
            <PdfViewerLazy fileUrl={contentItem.pdfUrl} />
          )}

          {contentItem.type === "HTML" && contentItem.htmlContent && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: contentItem.htmlContent }}
            />
          )}

          {contentItem.type === "EXTERNAL" && contentItem.externalUrl && (
            <div className="rounded-lg border p-6 text-center">
              <p className="mb-4 text-gray-600">
                This content is hosted externally. Click the link below to access it.
              </p>
              <a
                href={contentItem.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
              >
                Open External Content
              </a>
            </div>
          )}

          {contentItem.type === "PPT" && (
            <div className="rounded-lg border p-6 text-center">
              <p className="mb-4 text-gray-600">
                PowerPoint presentations are not yet supported in the viewer.
              </p>
              <p className="text-sm text-gray-500">
                Please download the file to view it.
              </p>
            </div>
          )}

          {contentItem.type === "TEST" && (
            <div className="rounded-lg border p-6 text-center">
              <p className="mb-4 text-gray-600">
                Click below to take the test.
              </p>
              <Button
                onClick={async () => {
                  // First check if test exists, if not show message
                  try {
                    const response = await fetch(`/api/tests/${contentItem.id}`);
                    if (response.ok) {
                      router.push(`/courses/${courseId}/tests/${contentItem.id}`);
                    } else {
                      alert("Test is not yet configured. Please contact your instructor.");
                    }
                  } catch (error) {
                    alert("Error loading test. Please try again.");
                  }
                }}
              >
                Take Test
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

