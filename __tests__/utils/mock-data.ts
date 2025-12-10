import { User } from "@/types/user";
import { Course } from "@/types/course";

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "mock-user-id",
    email: "mock@example.com",
    firstName: "Mock",
    lastName: "User",
    emailVerified: true,
    roles: ["LEARNER"],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockCourse(overrides?: Partial<Course>): Course {
  return {
    id: "mock-course-id",
    title: "Mock Course",
    description: "Mock course description",
    status: "PUBLISHED",
    type: "E-LEARNING",
    selfEnrollment: true,
    requiresApproval: false,
    publicAccess: true,
    sequentialRequired: true,
    allowSkipping: false,
    tags: [],
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

