import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { hashPassword } from "@/lib/auth/password";
import { parse } from "csv-parse/sync";

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin can import users
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "File is required" },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV
    let records: any[];
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Invalid CSV format" },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; email: string; error: string }> = [];
    let imported = 0;

    // Get all roles
    const allRoles = await prisma.role.findMany();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const row = i + 2; // +2 because CSV has header and 0-indexed

      try {
        // Validate required fields
        if (!record.email || !record.firstName || !record.lastName) {
          errors.push({
            row,
            email: record.email || "N/A",
            error: "Missing required fields (email, firstName, lastName)",
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.email)) {
          errors.push({
            row,
            email: record.email,
            error: "Invalid email format",
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: record.email },
        });

        if (existingUser) {
          errors.push({
            row,
            email: record.email,
            error: "Email already exists",
          });
          continue;
        }

        // Parse roles
        const roleNames = record.roles
          ? record.roles.split(",").map((r: string) => r.trim().toUpperCase())
          : ["LEARNER"];

        // Validate roles
        const validRoles = roleNames.filter((r: string) =>
          ["LEARNER", "INSTRUCTOR", "ADMIN"].includes(r)
        );

        if (validRoles.length === 0) {
          validRoles.push("LEARNER"); // Default role
        }

        const roleRecords = allRoles.filter((r) =>
          validRoles.includes(r.name)
        );

        // Hash password (use provided password or generate default)
        const password = record.password || "TempPassword123!";
        const passwordHash = await hashPassword(password);

        // Create user
        await prisma.user.create({
          data: {
            email: record.email,
            passwordHash,
            firstName: record.firstName,
            lastName: record.lastName,
            roles: {
              create: roleRecords.map((role) => ({
                roleId: role.id,
              })),
            },
          },
        });

        imported++;
      } catch (error: any) {
        errors.push({
          row,
          email: record.email || "N/A",
          error: error.message || "Unknown error",
        });
      }
    }

    return NextResponse.json({
      imported,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error importing users:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

