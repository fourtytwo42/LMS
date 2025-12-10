import { prisma } from "@/lib/db/prisma";
import { NextRequest } from "next/server";

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  changes?: Record<string, unknown>,
  request?: NextRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        changes: changes || {},
        ipAddress: request?.headers.get("x-forwarded-for") || request?.ip || null,
        userAgent: request?.headers.get("user-agent") || null,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error("Error creating audit log:", error);
  }
}

