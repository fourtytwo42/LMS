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

interface LearningPlan {
  id: string;
  title: string;
  shortDescription: string | null;
  status: string;
  coverImage: string | null;
}

interface LearningPlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (learningPlanIds: string[]) => Promise<void>;
  title: string;
  actionLabel?: string;
  excludeLearningPlanIds?: Set<string>; // Learning plans to exclude from the list
  singleSelect?: boolean; // If true, only one learning plan can be selected
}

export function LearningPlanSelectionModal({
  isOpen,
  onClose,
  onSelect,
  title,
  actionLabel = "Select",
  excludeLearningPlanIds = new Set(),
  singleSelect = false,
}: LearningPlanSelectionModalProps) {
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLearningPlanIds, setSelectedLearningPlanIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<string>("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch learning plans when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLearningPlans();
      setSearch("");
      setSelectedLearningPlanIds(new Set());
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      setSortBy("title");
      setSortOrder("asc");
    }
  }, [isOpen]);

  // Fetch learning plans when search, page, or sort changes
  useEffect(() => {
    if (isOpen) {
      fetchLearningPlans();
    }
  }, [search, pagination.page, sortBy, sortOrder, isOpen]);

  const fetchLearningPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/learning-plans?${params}`);
      if (!response.ok) throw new Error("Failed to fetch learning plans");

      const data = await response.json();
      
      // Filter out excluded learning plans
      const filteredLearningPlans = (data.learningPlans || []).filter(
        (plan: LearningPlan) => !excludeLearningPlanIds.has(plan.id)
      );

      // Sort learning plans
      const sortedLearningPlans = [...filteredLearningPlans].sort((a, b) => {
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

      setLearningPlans(sortedLearningPlans);
      setPagination({
        ...pagination,
        total: data.pagination?.total || filteredLearningPlans.length,
        totalPages: data.pagination?.totalPages || 1,
      });
    } catch (error) {
      console.error("Error fetching learning plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLearningPlan = (learningPlanId: string) => {
    if (singleSelect) {
      setSelectedLearningPlanIds(new Set([learningPlanId]));
    } else {
      setSelectedLearningPlanIds((prev) => {
        const next = new Set(prev);
        if (next.has(learningPlanId)) {
          next.delete(learningPlanId);
        } else {
          next.add(learningPlanId);
        }
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedLearningPlanIds.size === learningPlans.length) {
      setSelectedLearningPlanIds(new Set());
    } else {
      setSelectedLearningPlanIds(new Set(learningPlans.map((p) => p.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedLearningPlanIds.size === 0) return;

    setSubmitting(true);
    try {
      await onSelect(Array.from(selectedLearningPlanIds));
      setSelectedLearningPlanIds(new Set());
      onClose();
    } catch (error) {
      console.error("Error in learning plan selection:", error);
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

  const isAllSelected = learningPlans.length > 0 && selectedLearningPlanIds.size === learningPlans.length;

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
            placeholder: "Search learning plans...",
          }}
        />

        {selectedLearningPlanIds.size > 0 && !singleSelect && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedLearningPlanIds.size} learning plan(s) selected
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
          ) : learningPlans.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">No learning plans available</div>
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
                    {learningPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        {!singleSelect && (
                          <TableCell>
                            <button
                              onClick={() => handleSelectLearningPlan(plan.id)}
                              className="flex items-center justify-center"
                            >
                              {selectedLearningPlanIds.has(plan.id) ? (
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
                              {plan.title}
                            </div>
                            {plan.shortDescription && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {plan.shortDescription}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={plan.status === "PUBLISHED" ? "success" : "default"}>
                            {plan.status}
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
            itemName="learning plans"
          />
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedLearningPlanIds.size === 0 || submitting}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {actionLabel}{" "}
            {selectedLearningPlanIds.size > 0
              ? `${selectedLearningPlanIds.size} `
              : ""}
            Learning Plan{selectedLearningPlanIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

