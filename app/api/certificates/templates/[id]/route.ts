import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { z } from "zod";

// Import the templates array (in production, this would be from database)
// For now, we'll use a shared module or database
let certificateTemplates: any[] = [];

// This would normally be imported from a shared module or database
// For this implementation, we'll recreate the structure
const getTemplates = () => {
  if (certificateTemplates.length === 0) {
    certificateTemplates = [
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
  }
  return certificateTemplates;
};

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  template: z
    .object({
      layout: z.enum(["landscape", "portrait"]).optional(),
      background: z.string().optional(),
      logo: z.string().optional(),
      fields: z
        .object({
          title: z
            .object({
              x: z.number(),
              y: z.number(),
              fontSize: z.number(),
              fontFamily: z.string(),
            })
            .optional(),
          recipientName: z
            .object({
              x: z.number(),
              y: z.number(),
              fontSize: z.number(),
              fontFamily: z.string(),
            })
            .optional(),
          courseName: z
            .object({
              x: z.number(),
              y: z.number(),
              fontSize: z.number(),
              fontFamily: z.string(),
            })
            .optional(),
          completionDate: z
            .object({
              x: z.number(),
              y: z.number(),
              fontSize: z.number(),
              fontFamily: z.string(),
            })
            .optional(),
          signature: z
            .object({
              x: z.number(),
              y: z.number(),
              fontSize: z.number(),
              fontFamily: z.string(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let user;
    try {
      user = await authenticate(request);
    } catch (error: any) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return NextResponse.json(
          { error: error.errorCode || "UNAUTHORIZED", message: error.message || "Authentication required" },
          { status: error.statusCode || 401 }
        );
      }
      throw error;
    }

    // Only admins can view certificate templates
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const templates = getTemplates();
    const template = templates.find((t) => t.id === params.id);

    if (!template) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Certificate template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template,
    });
  } catch (error) {
    console.error("Error fetching certificate template:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let user;
    try {
      user = await authenticate(request);
    } catch (error: any) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return NextResponse.json(
          { error: error.errorCode || "UNAUTHORIZED", message: error.message || "Authentication required" },
          { status: error.statusCode || 401 }
        );
      }
      throw error;
    }

    // Only admins can update certificate templates
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const templates = getTemplates();
    const templateIndex = templates.findIndex((t) => t.id === params.id);

    if (templateIndex === -1) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Certificate template not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = updateTemplateSchema.parse(body);

    // Update template
    const updatedTemplate = {
      ...templates[templateIndex],
      ...validated,
      updatedAt: new Date(),
    };

    if (validated.template) {
      updatedTemplate.template = {
        ...templates[templateIndex].template,
        ...validated.template,
      };
    }

    templates[templateIndex] = updatedTemplate;
    certificateTemplates = templates;

    return NextResponse.json({
      template: updatedTemplate,
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

    console.error("Error updating certificate template:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let user;
    try {
      user = await authenticate(request);
    } catch (error: any) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return NextResponse.json(
          { error: error.errorCode || "UNAUTHORIZED", message: error.message || "Authentication required" },
          { status: error.statusCode || 401 }
        );
      }
      throw error;
    }

    // Only admins can delete certificate templates
    if (!user.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const templates = getTemplates();
    const templateIndex = templates.findIndex((t) => t.id === params.id);

    if (templateIndex === -1) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Certificate template not found" },
        { status: 404 }
      );
    }

    // Don't allow deleting the default template
    if (templates[templateIndex].id === "default") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Cannot delete default template" },
        { status: 400 }
      );
    }

    templates.splice(templateIndex, 1);
    certificateTemplates = templates;

    return NextResponse.json({
      message: "Certificate template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting certificate template:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

