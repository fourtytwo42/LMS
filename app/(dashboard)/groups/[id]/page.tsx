"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, UserPlus, X, BookOpen, GraduationCap, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { UserSelectionModal } from "@/components/users/user-selection-modal";
import { CourseSelectionModal } from "@/components/courses/course-selection-modal";
import { LearningPlanSelectionModal } from "@/components/learning-plans/learning-plan-selection-modal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { IconButton } from "@/components/ui/icon-button";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["STAFF", "EXTERNAL", "CUSTOM"]),
  description: z.string().optional(),
});

type UpdateGroupForm = z.infer<typeof updateGroupSchema>;

interface Member {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  joinedAt: string;
}

interface Course {
  id: string;
  title: string;
  shortDescription: string | null;
  coverImage: string | null;
  status: string;
  addedAt: string;
}

interface LearningPlan {
  id: string;
  title: string;
  shortDescription: string | null;
  coverImage: string | null;
  status: string;
  addedAt: string;
}

interface Group {
  id: string;
  name: string;
  type: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  members: Member[];
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [learningPlansLoading, setLearningPlansLoading] = useState(false);
  const [addCourseModalOpen, setAddCourseModalOpen] = useState(false);
  const [addLearningPlanModalOpen, setAddLearningPlanModalOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [learningPlanSearch, setLearningPlanSearch] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UpdateGroupForm>({
    resolver: zodResolver(updateGroupSchema),
  });

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}`);
        if (!response.ok) throw new Error("Failed to fetch group");

        const groupData = await response.json();
        setGroup(groupData);

        setValue("name", groupData.name);
        setValue("type", groupData.type);
        setValue("description", groupData.description || "");
      } catch (error) {
        console.error("Error fetching group:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
    fetchCourses();
    fetchLearningPlans();
  }, [groupId, setValue]);

  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/courses`);
      if (!response.ok) throw new Error("Failed to fetch courses");

      const data = await response.json();
      let filteredCourses = data.courses || [];

      if (courseSearch) {
        filteredCourses = filteredCourses.filter((course: Course) =>
          course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
          (course.shortDescription && course.shortDescription.toLowerCase().includes(courseSearch.toLowerCase()))
        );
      }

      setCourses(filteredCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchLearningPlans = async () => {
    setLearningPlansLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/learning-plans`);
      if (!response.ok) throw new Error("Failed to fetch learning plans");

      const data = await response.json();
      let filteredLearningPlans = data.learningPlans || [];

      if (learningPlanSearch) {
        filteredLearningPlans = filteredLearningPlans.filter((plan: LearningPlan) =>
          plan.title.toLowerCase().includes(learningPlanSearch.toLowerCase()) ||
          (plan.shortDescription && plan.shortDescription.toLowerCase().includes(learningPlanSearch.toLowerCase()))
        );
      }

      setLearningPlans(filteredLearningPlans);
    } catch (error) {
      console.error("Error fetching learning plans:", error);
    } finally {
      setLearningPlansLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchCourses();
    }
  }, [courseSearch, groupId]);

  useEffect(() => {
    if (groupId) {
      fetchLearningPlans();
    }
  }, [learningPlanSearch, groupId]);

  const onSubmit = async (data: UpdateGroupForm) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update group");

      const result = await response.json();
      setGroup((prev) => prev ? { ...prev, ...result.group } : null);
      alert("Group updated successfully");
    } catch (error) {
      console.error("Error updating group:", error);
      alert("Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async (userIds: string[]) => {
    try {
      // Add members one by one (API might support bulk in the future)
      for (const userId of userIds) {
        const response = await fetch(`/api/groups/${groupId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to add member: ${userId}`);
        }
      }

      // Refresh group data
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData);
      }

      alert(`Successfully added ${userIds.length} member(s) to group`);
    } catch (error) {
      console.error("Error adding members:", error);
      alert(error instanceof Error ? error.message : "Failed to add members");
      throw error;
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove member");

      // Refresh group data
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member");
    }
  };

  const handleAddCourses = async (courseIds: string[]) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds }),
      });

      if (!response.ok) throw new Error("Failed to add courses");

      alert(`Successfully added ${courseIds.length} course(s) to group`);
      fetchCourses();
    } catch (error) {
      console.error("Error adding courses:", error);
      alert(error instanceof Error ? error.message : "Failed to add courses");
      throw error;
    }
  };

  const handleAddLearningPlans = async (learningPlanIds: string[]) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/learning-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningPlanIds }),
      });

      if (!response.ok) throw new Error("Failed to add learning plans");

      alert(`Successfully added ${learningPlanIds.length} learning plan(s) to group`);
      fetchLearningPlans();
    } catch (error) {
      console.error("Error adding learning plans:", error);
      alert(error instanceof Error ? error.message : "Failed to add learning plans");
      throw error;
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to remove this course from the group?")) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/courses?courseId=${courseId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove course");

      fetchCourses();
    } catch (error) {
      console.error("Error removing course:", error);
      alert("Failed to remove course");
    }
  };

  const handleRemoveLearningPlan = async (learningPlanId: string) => {
    if (!confirm("Are you sure you want to remove this learning plan from the group?")) return;

    try {
      const response = await fetch(`/api/groups/${groupId}/learning-plans?learningPlanId=${learningPlanId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove learning plan");

      fetchLearningPlans();
    } catch (error) {
      console.error("Error removing learning plan:", error);
      alert("Failed to remove learning plan");
    }
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  if (!group) {
    return <div className="py-8 text-center">Group not found</div>;
  }

  // Get set of user IDs who are already members
  const memberUserIds = new Set(group.members.map((member) => member.userId));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/groups")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Group Details</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Edit Group</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name *</label>
              <Input
                {...register("name")}
                error={errors.name?.message}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Type *</label>
              <Select {...register("type")} error={errors.type?.message}>
                <option value="STAFF">Staff</option>
                <option value="EXTERNAL">External</option>
                <option value="CUSTOM">Custom</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                {...register("description")}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/groups")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Group Info</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Type</div>
              <div className="mt-1">
                <Badge variant="info">{group.type}</Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Members</div>
              <div className="mt-1 text-sm font-medium">
                {group.memberCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="mt-1 text-sm">
                {new Date(group.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Courses</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddCourseModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </div>

          <TableToolbar
            search={{
              value: courseSearch,
              onChange: setCourseSearch,
              placeholder: "Search courses...",
            }}
          />

          {coursesLoading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : courses.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No courses in this group</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.title}</div>
                          {course.shortDescription && (
                            <div className="text-sm text-gray-500">{course.shortDescription}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={course.status === "PUBLISHED" ? "success" : "default"}>
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <IconButton
                          icon={<Trash2 className="h-4 w-4" />}
                          label="Remove Course"
                          onClick={() => handleRemoveCourse(course.id)}
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

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Learning Plans</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddLearningPlanModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Learning Plan
            </Button>
          </div>

          <TableToolbar
            search={{
              value: learningPlanSearch,
              onChange: setLearningPlanSearch,
              placeholder: "Search learning plans...",
            }}
          />

          {learningPlansLoading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : learningPlans.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No learning plans in this group</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learningPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.title}</div>
                          {plan.shortDescription && (
                            <div className="text-sm text-gray-500">{plan.shortDescription}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.status === "PUBLISHED" ? "success" : "default"}>
                          {plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <IconButton
                          icon={<Trash2 className="h-4 w-4" />}
                          label="Remove Learning Plan"
                          onClick={() => handleRemoveLearningPlan(plan.id)}
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
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Members</h2>
          <Button
            variant="secondary"
            onClick={() => setAddMemberModalOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        {group.members.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No members in this group
          </div>
        ) : (
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatar || undefined}
                    name={`${member.firstName} ${member.lastName}`}
                    size="sm"
                  />
                  <div>
                    <div className="font-medium">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(member.userId)}
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <UserSelectionModal
        isOpen={addMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        onSelect={handleAddMembers}
        title="Add Members to Group"
        actionLabel="Add"
        excludeUserIds={memberUserIds}
        singleSelect={false}
      />

      <CourseSelectionModal
        isOpen={addCourseModalOpen}
        onClose={() => setAddCourseModalOpen(false)}
        onSelect={handleAddCourses}
        title="Add Courses to Group"
        actionLabel="Add"
        excludeCourseIds={new Set(courses.map((c) => c.id))}
        singleSelect={false}
      />

      <LearningPlanSelectionModal
        isOpen={addLearningPlanModalOpen}
        onClose={() => setAddLearningPlanModalOpen(false)}
        onSelect={handleAddLearningPlans}
        title="Add Learning Plans to Group"
        actionLabel="Add"
        excludeLearningPlanIds={new Set(learningPlans.map((p) => p.id))}
        singleSelect={false}
      />
    </div>
  );
}

