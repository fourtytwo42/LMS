export interface Enrollment {
  id: string;
  userId: string;
  courseId?: string;
  learningPlanId?: string;
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";
  enrollmentType: "MANUAL" | "SELF" | "GROUP" | "AUTO";
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  requiresApproval: boolean;
  approvedAt?: Date;
  approvedById?: string;
}

