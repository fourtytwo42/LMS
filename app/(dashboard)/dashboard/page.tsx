import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  console.log("🔍 Dashboard page - Checking authentication...");
  console.log("   Token present:", !!token);
  console.log("   All cookies:", cookieStore.getAll().map(c => c.name));

  if (!token) {
    console.error("❌ Dashboard: No accessToken cookie found");
    redirect("/login");
  }

  try {
    console.log("🔍 Dashboard: Verifying token...");
    const payload = verifyToken(token);
    console.log("✅ Dashboard: Token verified, userId:", payload.userId);
    
    console.log("🔍 Dashboard: Fetching user from database...");
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
      console.error("❌ Dashboard: User not found in database for userId:", payload.userId);
      redirect("/login");
    }

    console.log("✅ Dashboard: User found:", user.email);
    const roles = user.roles.map((ur) => ur.role.name);
    console.log("   User roles:", roles);

    // Redirect based on role (admin > instructor > learner)
    if (roles.includes("ADMIN")) {
      console.log("🔄 Dashboard: Redirecting to /dashboard/admin");
      redirect("/dashboard/admin");
    } else if (roles.includes("INSTRUCTOR")) {
      console.log("🔄 Dashboard: Redirecting to /dashboard/instructor");
      redirect("/dashboard/instructor");
    } else {
      console.log("🔄 Dashboard: Redirecting to /dashboard/learner");
      redirect("/dashboard/learner");
    }
  } catch (error) {
    // Next.js redirect() throws a special error that we should not catch
    // Check if this is a redirect error and re-throw it
    if (error && typeof error === "object" && "digest" in error) {
      const redirectError = error as { digest?: string };
      if (redirectError.digest?.includes("NEXT_REDIRECT")) {
        // This is a redirect, re-throw it so Next.js can handle it
        throw error;
      }
    }
    
    console.error("❌ Dashboard: Error verifying token or fetching user:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
      console.error("   Error stack:", error.stack);
    }
    redirect("/login");
  }
}

