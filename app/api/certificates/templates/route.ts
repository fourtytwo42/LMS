import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// Certificate templates stored in database (could also be file-based)
// For now, we'll use a simple JSON structure stored in a settings table or file
// In production, this would be a proper CertificateTemplate model

interface CertificateTemplate {
  id: string;
  name: string;
  description?: string;
  template: {
    layout: "landscape" | "portrait";
    background?: string;
    logo?: string;
    fields: {
      title: { x: number; y: number; fontSize: number; fontFamily: string };
      recipientName: { x: number; y: number; fontSize: number; fontFamily: string };
      courseName: { x: number; y: number; fontSize: number; fontFamily: string };
      completionDate: { x: number; y: number; fontSize: number; fontFamily: string };
      signature?: { x: number; y: number; fontSize: number; fontFamily: string };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage (in production, use database)
let certificateTemplates: CertificateTemplate[] = [
  {
    id: "default",
    name: "Default Certificate",
    description: "Standard certificate template",
    template: {
      layout: "landscape",
      fields: {
        title: { x: 400, y: 100, fontSize: 48, fontFamily: "Arial" },
        recipientName: { x: 400, y: 250, fontSize: 36, fontFamily: "Arial" },
        courseName: { x: 400, y: 350, fontSize: 24, fontFamily: "Arial" },
        completionDate: { x: 400, y: 450, fontSize: 18, fontFamily: "Arial" },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  template: z.object({
    layout: z.enum(["landscape", "portrait"]),
    background: z.string().optional(),
    logo: z.string().optional(),
    fields: z.object({
      title: z.object({
        x: z.number(),
        y: z.number(),
        fontSize: z.number(),
        fontFamily: z.string(),
      }),
      recipientName: z.object({
        x: z.number(),
        y: z.number(),
        fontSize: z.number(),
        fontFamily: z.string(),
      }),
      courseName: z.object({
        x: z.number(),
        y: z.number(),
        fontSize: z.number(),
        fontFamily: z.string(),
      }),
      completionDate: z.object({
        x: z.number(),
        y: z.number(),
        fontSize: z.number(),
        fontFamily: z.string(),
      }),
      signature: z
        .object({
          x: z.number(),
          y: z.number(),
          fontSize: z.number(),
          fontFamily: z.string(),
        })
        .optional(),
    }),
  }),
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

    // Only admins can view certificate templates
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      templates: certificateTemplates,
    });
  } catch (error) {
    console.error("Error fetching certificate templates:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admins can create certificate templates
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createTemplateSchema.parse(body);

    const newTemplate: CertificateTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: validated.name,
      description: validated.description,
      template: validated.template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    certificateTemplates.push(newTemplate);

    return NextResponse.json(
      {
        template: newTemplate,
      },
      { status: 201 }
    );
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

    console.error("Error creating certificate template:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

