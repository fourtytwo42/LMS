import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

// In production, store settings in database
// For now, we'll use default values and allow updates (stored in memory or file)
let systemSettings = {
  selfRegistration: {
    enabled: true,
    emailVerification: false,
  },
  password: {
    resetEnabled: true,
    complexityRequired: true,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  accountLockout: {
    enabled: false,
    maxAttempts: 5,
    lockoutDuration: 30, // minutes
  },
  email: {
    smtpEnabled: false,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "",
  },
  sso: {
    enabled: false,
    provider: "LDAP",
    config: {},
  },
};

const updateSettingsSchema = z.object({
  selfRegistration: z
    .object({
      enabled: z.boolean().optional(),
      emailVerification: z.boolean().optional(),
    })
    .optional(),
  password: z
    .object({
      resetEnabled: z.boolean().optional(),
      complexityRequired: z.boolean().optional(),
      minLength: z.number().int().min(6).optional(),
      requireUppercase: z.boolean().optional(),
      requireLowercase: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireSpecialChars: z.boolean().optional(),
    })
    .optional(),
  accountLockout: z
    .object({
      enabled: z.boolean().optional(),
      maxAttempts: z.number().int().min(1).optional(),
      lockoutDuration: z.number().int().min(1).optional(),
    })
    .optional(),
  email: z
    .object({
      smtpEnabled: z.boolean().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.number().int().min(1).max(65535).optional(),
      smtpUser: z.string().optional(),
      smtpPassword: z.string().optional(),
      fromEmail: z.string().email().optional(),
    })
    .optional(),
  sso: z
    .object({
      enabled: z.boolean().optional(),
      provider: z.string().optional(),
      config: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admins can view settings
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(systemSettings);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admins can update settings
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateSettingsSchema.parse(body);

    // Merge settings
    if (validated.selfRegistration) {
      systemSettings.selfRegistration = {
        ...systemSettings.selfRegistration,
        ...validated.selfRegistration,
      };
    }

    if (validated.password) {
      systemSettings.password = {
        ...systemSettings.password,
        ...validated.password,
      };
    }

    if (validated.accountLockout) {
      systemSettings.accountLockout = {
        ...systemSettings.accountLockout,
        ...validated.accountLockout,
      };
    }

    if (validated.email) {
      systemSettings.email = {
        ...systemSettings.email,
        ...validated.email,
      };
    }

    if (validated.sso) {
      systemSettings.sso = {
        ...systemSettings.sso,
        ...validated.sso,
      };
    }

    // TODO: In production, save to database or file

    return NextResponse.json({
      message: "Settings updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.issues.reduce((acc, err) => {
            acc[err.path.join(".")] = err.message;
            return acc;
          }, {} as Record<string, string>),
        },
        { status: 400 }
      );
    }

    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

