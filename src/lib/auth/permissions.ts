import { prisma } from "@/lib/db/prisma";

/**
 * Check if a user has instructor access to a learning plan
 * (either directly assigned or enrolled as instructor)
 */
export async function isLearningPlanInstructor(
  userId: string,
  learningPlanId: string
): Promise<boolean> {
  // Check if user is directly assigned as instructor
  const directAssignment = await prisma.instructorAssignment.findUnique({
    where: {
      userId_learningPlanId: {
        userId,
        learningPlanId,
      },
    },
  });

  if (directAssignment) {
    return true;
  }

  // Check if user is enrolled as instructor in the learning plan
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_learningPlanId: {
        userId,
        learningPlanId,
      },
    },
  });

  if (!enrollment) {
    return false;
  }

  // Check if there's an instructor assignment for this enrollment
  const instructorAssignment = await prisma.instructorAssignment.findUnique({
    where: {
      userId_learningPlanId: {
        userId,
        learningPlanId,
      },
    },
  });

  return !!instructorAssignment;
}

/**
 * Check if a user has instructor access to a course
 * (either directly assigned, creator, or enrolled as instructor in a learning plan containing the course)
 */
export async function isCourseInstructor(
  userId: string,
  courseId: string
): Promise<boolean> {
  // Check if user is directly assigned as instructor
  const directAssignment = await prisma.instructorAssignment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });

  if (directAssignment) {
    return true;
  }

  // Check if user is the creator
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { createdById: true },
  });

  if (course?.createdById === userId) {
    return true;
  }

  // Check if user is enrolled as instructor in a learning plan that contains this course
  const learningPlanEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      learningPlan: {
        courses: {
          some: {
            courseId,
          },
        },
      },
    },
    include: {
      learningPlan: {
        select: {
          id: true,
        },
      },
    },
  });

  if (learningPlanEnrollment) {
    const instructorAssignment = await prisma.instructorAssignment.findFirst({
      where: {
        userId,
        learningPlanId: learningPlanEnrollment.learningPlanId,
      },
    });
    return !!instructorAssignment;
  }

  return false;
}

