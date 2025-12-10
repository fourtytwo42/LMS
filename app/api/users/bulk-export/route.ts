import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { createObjectCsvStringifier } from "csv-writer";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can export users
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const groupId = searchParams.get("groupId");

    // Build where clause
    const where: any = {};

    if (roleFilter) {
      where.roles = {
        some: {
          role: {
            name: roleFilter,
          },
        },
      };
    }

    if (groupId) {
      where.groups = {
        some: {
          groupId: groupId,
        },
      };
    }

    // Fetch all users
    const users = await prisma.user.findMany({
      where,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Prepare CSV data
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "email", title: "Email" },
        { id: "firstName", title: "First Name" },
        { id: "lastName", title: "Last Name" },
        { id: "roles", title: "Roles" },
        { id: "emailVerified", title: "Email Verified" },
        { id: "createdAt", title: "Created At" },
        { id: "lastLoginAt", title: "Last Login" },
      ],
    });

    const records = users.map((u) => ({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.roles.map((r) => r.role.name).join(","),
      emailVerified: u.emailVerified ? "Yes" : "No",
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : "",
    }));

    const csvContent =
      csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting users:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

