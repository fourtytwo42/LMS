"use client";

import { useState, useEffect } from "react";
import { Users, ArrowUp, ArrowDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { CheckSquare as CheckSquareIcon, Square as SquareIcon } from "lucide-react";

interface Group {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

interface GroupSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (groupIds: string[]) => Promise<void>;
  title: string;
  actionLabel?: string;
  excludeGroupIds?: Set<string>; // Groups to exclude from the list
  singleSelect?: boolean; // If true, only one group can be selected
}

export function GroupSelectionModal({
  isOpen,
  onClose,
  onSelect,
  title,
  actionLabel = "Select",
  excludeGroupIds = new Set(),
  singleSelect = false,
}: GroupSelectionModalProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch groups when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      setSearch("");
      setSelectedGroupIds(new Set());
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      setSortBy("name");
      setSortOrder("asc");
    }
  }, [isOpen]);

  // Fetch groups when search, page, or sort changes
  useEffect(() => {
    if (isOpen) {
      fetchGroups();
    }
  }, [search, pagination.page, sortBy, sortOrder, isOpen]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/groups");
      if (!response.ok) throw new Error("Failed to fetch groups");

      const data = await response.json();
      
      // Filter out excluded groups
      let filteredGroups = (data.groups || []).filter(
        (group: Group) => !excludeGroupIds.has(group.id)
      );

      // Apply search filter
      if (search) {
        filteredGroups = filteredGroups.filter((group: Group) =>
          group.name.toLowerCase().includes(search.toLowerCase()) ||
          (group.description && group.description.toLowerCase().includes(search.toLowerCase()))
        );
      }

      // Sort groups
      const sortedGroups = [...filteredGroups].sort((a, b) => {
        let aVal: string;
        let bVal: string;
        
        if (sortBy === "name") {
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
        } else if (sortBy === "type") {
          aVal = a.type.toLowerCase();
          bVal = b.type.toLowerCase();
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

      setGroups(sortedGroups);
      setPagination({
        ...pagination,
        total: sortedGroups.length,
        totalPages: Math.ceil(sortedGroups.length / pagination.limit),
      });
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    if (singleSelect) {
      setSelectedGroupIds(new Set([groupId]));
    } else {
      setSelectedGroupIds((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedGroupIds.size === groups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(groups.map((g) => g.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedGroupIds.size === 0) return;

    setSubmitting(true);
    try {
      await onSelect(Array.from(selectedGroupIds));
      setSelectedGroupIds(new Set());
      onClose();
    } catch (error) {
      console.error("Error in group selection:", error);
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

  const isAllSelected = groups.length > 0 && selectedGroupIds.size === groups.length;
  const paginatedGroups = groups.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

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
            placeholder: "Search groups...",
          }}
        />

        {selectedGroupIds.size > 0 && !singleSelect && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedGroupIds.size} group(s) selected
            </div>
            <Button onClick={handleSubmit} variant="primary" disabled={submitting}>
              <Users className="mr-2 h-4 w-4" />
              {actionLabel} Selected
            </Button>
          </div>
        )}

        <div className="max-h-96 overflow-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">No groups available</div>
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
                        <SortableHeader column="name" label="Name" />
                      </TableHead>
                      <TableHead>
                        <SortableHeader column="type" label="Type" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGroups.map((group) => (
                      <TableRow key={group.id}>
                        {!singleSelect && (
                          <TableCell>
                            <button
                              onClick={() => handleSelectGroup(group.id)}
                              className="flex items-center justify-center"
                            >
                              {selectedGroupIds.has(group.id) ? (
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
                              {group.name}
                            </div>
                            {group.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {group.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{group.type}</Badge>
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
            itemName="groups"
          />
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedGroupIds.size === 0 || submitting}
          >
            <Users className="mr-2 h-4 w-4" />
            {actionLabel}{" "}
            {selectedGroupIds.size > 0
              ? `${selectedGroupIds.size} `
              : ""}
            Group{selectedGroupIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

