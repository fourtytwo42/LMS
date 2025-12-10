import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can view overview analytics
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get user statistics
    const [totalUsers, learners, instructors, admins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          roles: {
            some: {
              role: { name: "LEARNER" },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          roles: {
            some: {
              role: { name: "INSTRUCTOR" },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          roles: {
            some: {
              role: { name: "ADMIN" },
            },
          },
        },
      }),
    ]);

    // Get course statistics
    const [totalCourses, publishedCourses, draftCourses, archivedCourses] =
      await Promise.all([
        prisma.course.count(),
        prisma.course.count({ where: { status: "PUBLISHED" } }),
        prisma.course.count({ where: { status: "DRAFT" } }),
        prisma.course.count({ where: { status: "ARCHIVED" } }),
      ]);

    // Get learning plan statistics
    const [totalPlans, publishedPlans] = await Promise.all([
      prisma.learningPlan.count(),
      prisma.learningPlan.count({ where: { status: "PUBLISHED" } }),
    ]);

    // Get enrollment statistics
    const [totalEnrollments, activeEnrollments, completedEnrollments, droppedEnrollments] =
      await Promise.all([
        prisma.enrollment.count(),
        prisma.enrollment.count({
          where: { status: "IN_PROGRESS" },
        }),
        prisma.enrollment.count({
          where: { status: "COMPLETED" },
        }),
        prisma.enrollment.count({
          where: { status: "DROPPED" },
        }),
      ]);

    // Get enrollment trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const enrollmentsByDate = await prisma.enrollment.groupBy({
      by: ["enrolledAt"],
      where: {
        enrolledAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    const enrollmentTrends = enrollmentsByDate.map((item) => ({
      date: item.enrolledAt.toISOString().split("T")[0],
      count: item._count.id,
    }));

    return NextResponse.json({
      users: {
        total: totalUsers,
        learners,
        instructors,
        admins,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: draftCourses,
        archived: archivedCourses,
      },
      learningPlans: {
        total: totalPlans,
        published: publishedPlans,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        dropped: droppedEnrollments,
      },
      trends: {
        enrollments: enrollmentTrends,
      },
    });
  } catch (error) {
    console.error("Error fetching overview analytics:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

