"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  order: number;
}

interface PrerequisitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentItemId: string;
  courseId: string;
  currentTitle: string;
}

export function PrerequisitesModal({
  isOpen,
  onClose,
  contentItemId,
  courseId,
  currentTitle,
}: PrerequisitesModalProps) {
  const [availableItems, setAvailableItems] = useState<ContentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && contentItemId) {
      fetchData();
    } else {
      setSelectedIds(new Set());
      setAvailableItems([]);
    }
  }, [isOpen, contentItemId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all content items in the course
      const [contentResponse, prerequisitesResponse] = await Promise.all([
        fetch(`/api/courses/${courseId}/content`),
        fetch(`/api/content/${contentItemId}/prerequisites`),
      ]);

      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        // Filter out the current item and sort by order
        const items = (contentData.contentItems || [])
          .filter((item: ContentItem) => item.id !== contentItemId)
          .sort((a: ContentItem, b: ContentItem) => a.order - b.order);
        setAvailableItems(items);
      }

      if (prerequisitesResponse.ok) {
        const prerequisitesData = await prerequisitesResponse.json();
        setSelectedIds(new Set(prerequisitesData.prerequisites.map((p: ContentItem) => p.id)));
      }
    } catch (error) {
      console.error("Error fetching prerequisites data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (itemId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/content/${contentItemId}/prerequisites`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prerequisiteIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update prerequisites");
      }

      onClose();
    } catch (error) {
      console.error("Error saving prerequisites:", error);
      alert(error instanceof Error ? error.message : "Failed to save prerequisites");
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
      case "YOUTUBE":
        return "🎥";
      case "PDF":
        return "📄";
      case "PPT":
        return "📊";
      case "TEST":
        return "📝";
      default:
        return "📄";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Prerequisites">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select which training materials must be completed before <strong>{currentTitle}</strong> becomes available.
        </p>

        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : availableItems.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No other training materials available in this course.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
            {availableItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${isSelected 
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" 
                      : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    }
                  `}
                  onClick={() => handleToggle(item.id)}
                >
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(item.type)}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="info" className="text-xs">
                        {item.type}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Order: {item.order}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Prerequisites"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

