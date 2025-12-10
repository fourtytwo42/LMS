import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/utils/errors";

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

export async function authenticate(request: NextRequest): Promise<AuthenticatedUser> {
  const token = request.cookies.get("accessToken")?.value;

  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "User not found");
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}

export function requireRole(user: AuthenticatedUser, allowedRoles: string[]): void {
  const hasRole = user.roles.some((role) => allowedRoles.includes(role));
  if (!hasRole) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }
}

