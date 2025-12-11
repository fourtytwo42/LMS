import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export async function createTestUser(data: {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
}) {
  const passwordHash = await hashPassword(data.password || "TestPassword123");

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName || "Test",
      lastName: data.lastName || "User",
      roles: {
        create: data.roles?.map((roleName) => ({
          role: {
            connectOrCreate: {
              where: { name: roleName },
              create: {
                name: roleName,
                description: `${roleName} role`,
                permissions: [],
              },
            },
          },
        })) || [
          {
            role: {
              connectOrCreate: {
                where: { name: "LEARNER" },
                create: {
                  name: "LEARNER",
                  description: "Learner role",
                  permissions: [],
                },
              },
            },
          },
        ],
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  return user;
}

export async function cleanupDatabase() {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "test-",
      },
    },
  });
}

export async function createTestCourse(createdById: string, title: string) {
  return await prisma.course.create({
    data: {
      title,
      description: "Test course",
      status: "PUBLISHED",
      type: "E-LEARNING",
      createdById,
    },
  });
}

export function authenticateRequest(request: Request, token: string): Request {
  const headers = new Headers(request.headers);
  headers.set("Cookie", `accessToken=${token}`);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
  });
}

/**
 * Safe cleanup utility - best practice for test cleanup
 * Handles errors gracefully and ensures cleanup doesn't fail tests
 */
export async function safeCleanup(
  cleanupFn: () => Promise<void>,
  errorContext?: string
): Promise<void> {
  try {
    await cleanupFn();
  } catch (error) {
    // Log but don't throw - cleanup errors shouldn't fail tests
    const context = errorContext ? `${errorContext}: ` : "";
    console.warn(`${context}Cleanup warning:`, error);
  }
}

/**
 * Safe cleanup for multiple operations
 * Executes all cleanup functions even if some fail
 */
export async function safeCleanupAll(
  cleanupFns: Array<{ fn: () => Promise<void>; context?: string }>
): Promise<void> {
  await Promise.allSettled(
    cleanupFns.map(({ fn, context }) => safeCleanup(fn, context))
  );
}

/**
 * Cleanup users and all related data in proper order
 * Best practice: Delete child records before parent records to avoid foreign key constraints
 */
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return;

  try {
    // Get user IDs first
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) return;

    // Delete courses and learning plans created by users FIRST (before other dependencies)
    const courses = await prisma.course.findMany({
      where: { createdById: { in: userIds } },
      select: { id: true },
    });
    const courseIds = courses.map((c) => c.id);
    
    if (courseIds.length > 0) {
      // Delete content items and their dependencies
      const contentItems = await prisma.contentItem.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      });
      const contentItemIds = contentItems.map((ci) => ci.id);
      
      if (contentItemIds.length > 0) {
        const tests = await prisma.test.findMany({
          where: { contentItemId: { in: contentItemIds } },
          select: { id: true },
        });
        const testIds = tests.map((t) => t.id);
        
        if (testIds.length > 0) {
          await prisma.testAnswer.deleteMany({ where: { attempt: { testId: { in: testIds } } } });
          await prisma.testAttempt.deleteMany({ where: { testId: { in: testIds } } });
          await prisma.question.deleteMany({ where: { testId: { in: testIds } } });
          await prisma.test.deleteMany({ where: { id: { in: testIds } } });
        }
        
        await prisma.videoProgress.deleteMany({ where: { contentItemId: { in: contentItemIds } } });
        await prisma.completion.deleteMany({ where: { contentItemId: { in: contentItemIds } } });
        await prisma.contentItem.deleteMany({ where: { id: { in: contentItemIds } } });
      }
      
      await prisma.completion.deleteMany({ where: { courseId: { in: courseIds } } });
      await prisma.enrollment.deleteMany({ where: { courseId: { in: courseIds } } });
      await prisma.repositoryFile.deleteMany({ where: { courseId: { in: courseIds } } });
      await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    }
    
    // Delete learning plans
    const learningPlans = await prisma.learningPlan.findMany({
      where: { createdById: { in: userIds } },
      select: { id: true },
    });
    const learningPlanIds = learningPlans.map((lp) => lp.id);
    
    if (learningPlanIds.length > 0) {
      await prisma.learningPlanCourse.deleteMany({ where: { learningPlanId: { in: learningPlanIds } } });
      await prisma.enrollment.deleteMany({ where: { learningPlanId: { in: learningPlanIds } } });
      await prisma.learningPlan.deleteMany({ where: { id: { in: learningPlanIds } } });
    }

    // Delete in dependency order (child records first)
    await Promise.all([
      // Delete user-related records
      prisma.testAnswer.deleteMany({ where: { attempt: { userId: { in: userIds } } } }),
      prisma.testAttempt.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.videoProgress.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.completion.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.enrollment.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.fileDownload.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.rating.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.groupMember.deleteMany({ where: { userId: { in: userIds } } }),
      // Delete instructor assignments where user is assigned
      prisma.instructorAssignment.deleteMany({ where: { userId: { in: userIds } } }),
      // Delete instructor assignments where user created the assignment
      prisma.instructorAssignment.deleteMany({ where: { assignedById: { in: userIds } } }),
      // Delete repository files uploaded by user (if not already deleted with courses)
      prisma.repositoryFile.deleteMany({ where: { uploadedById: { in: userIds } } }),
      // Delete content repositories uploaded by user
      prisma.contentRepository.deleteMany({ where: { uploadedById: { in: userIds } } }),
      // Delete question repositories created by user
      prisma.questionRepository.deleteMany({ where: { createdById: { in: userIds } } }),
    ]);

    // Finally delete users (parent records)
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  } catch (error) {
    console.warn("Error cleaning up test users:", error);
    // Try to delete users anyway (might succeed if dependencies are gone)
    try {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    } catch (e) {
      // Ignore final error
    }
  }
}

