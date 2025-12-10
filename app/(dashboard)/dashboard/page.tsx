import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      redirect("/login");
    }

    const roles = user.roles.map((ur) => ur.role.name);

    // Redirect based on role (admin > instructor > learner)
    if (roles.includes("ADMIN")) {
      redirect("/dashboard/admin");
    } else if (roles.includes("INSTRUCTOR")) {
      redirect("/dashboard/instructor");
    } else {
      redirect("/dashboard/learner");
    }
  } catch (error) {
    redirect("/login");
  }
}

