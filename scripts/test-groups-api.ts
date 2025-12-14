// Test script to check the groups API
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testGroupsAPI() {
  try {
    // Get a learning plan that has groups
    const learningPlanWithGroups = await prisma.learningPlanGroupAccess.findFirst({
      include: {
        learningPlan: {
          select: {
            id: true,
            title: true,
            createdById: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!learningPlanWithGroups) {
      console.log("No learning plan with groups found");
      return;
    }

    console.log("\n=== Testing Learning Plan Groups API ===");
    console.log(`Learning Plan ID: ${learningPlanWithGroups.learningPlanId}`);
    console.log(`Learning Plan Title: ${learningPlanWithGroups.learningPlan.title}`);
    console.log(`Created By: ${learningPlanWithGroups.learningPlan.createdById}`);
    console.log(`Group: ${learningPlanWithGroups.group.name} (${learningPlanWithGroups.groupId})`);

    // Test the query that the API uses
    const groupAccesses = await prisma.learningPlanGroupAccess.findMany({
      where: { learningPlanId: learningPlanWithGroups.learningPlanId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`\nFound ${groupAccesses.length} group access records:`);
    groupAccesses.forEach((access) => {
      console.log(`  - Group: ${access.group?.name || "NULL"} (${access.groupId})`);
      console.log(`    Learning Plan: ${access.learningPlanId}`);
      console.log(`    Created: ${access.createdAt}`);
      if (!access.group) {
        console.log(`    ⚠️  ORPHANED: Group is null!`);
      }
    });

    // Check for orphaned records
    const orphaned = groupAccesses.filter((a) => a.group === null);
    if (orphaned.length > 0) {
      console.log(`\n⚠️  Found ${orphaned.length} orphaned records (group is null)`);
    }

    // Also check from the group side
    console.log("\n=== Testing Group Learning Plans API ===");
    const groupLearningPlans = await prisma.learningPlanGroupAccess.findMany({
      where: { groupId: learningPlanWithGroups.groupId },
      include: {
        learningPlan: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    console.log(`Group ${learningPlanWithGroups.group.name} has ${groupLearningPlans.length} learning plans:`);
    groupLearningPlans.forEach((access) => {
      console.log(`  - Learning Plan: ${access.learningPlan.title} (${access.learningPlanId})`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testGroupsAPI();

