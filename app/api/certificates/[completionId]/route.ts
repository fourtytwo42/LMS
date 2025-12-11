import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  try {
    const { completionId } = await params;
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
    }

    const completion = await prisma.completion.findUnique({
      where: { id: completionId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
        learningPlan: {
          select: {
            id: true,
            title: true,
            code: true,
            hasCertificate: true,
            certificateTemplate: true,
          },
        },
      },
    });

    if (!completion) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Completion not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = user.roles.includes("ADMIN");
    if (!isAdmin && completion.userId !== user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if certificate is enabled (only learning plans have hasCertificate field)
    const hasCertificate = completion.learningPlan?.hasCertificate;
    if (!hasCertificate) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Certificate not available for this completion" },
        { status: 400 }
      );
    }

    // Check if this is a valid completion (existence of record means completed)
    if (!completion.completedAt) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Course/plan not yet completed" },
        { status: 400 }
      );
    }

    // Generate certificate PDF
    // For now, return a simple HTML certificate that can be printed
    // In production, you would use a PDF library like pdfkit or puppeteer
    const certificateHtml = generateCertificateHTML(completion);

    // Return as PDF (in production, convert HTML to PDF)
    // For now, return HTML that can be printed to PDF
    return new NextResponse(certificateHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="certificate-${completionId}.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating certificate:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

function generateCertificateHTML(completion: any): string {
  const userName = `${completion.user.firstName} ${completion.user.lastName}`;
  const courseTitle = completion.course?.title || completion.learningPlan?.title || "Course";
  const completedDate = completion.completedAt
    ? new Date(completion.completedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate of Completion</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Times New Roman', serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .certificate {
      width: 11in;
      height: 8.5in;
      background: white;
      border: 20px solid #d4af37;
      padding: 60px;
      text-align: center;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      position: relative;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: 20px;
      border: 2px solid #d4af37;
    }
    h1 {
      font-size: 48px;
      color: #2c3e50;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 4px;
    }
    .subtitle {
      font-size: 24px;
      color: #7f8c8d;
      margin: 20px 0;
    }
    .name {
      font-size: 36px;
      color: #2c3e50;
      margin: 40px 0;
      font-weight: bold;
      border-bottom: 2px solid #d4af37;
      padding-bottom: 20px;
      display: inline-block;
    }
    .course {
      font-size: 28px;
      color: #34495e;
      margin: 30px 0;
    }
    .date {
      font-size: 20px;
      color: #7f8c8d;
      margin-top: 40px;
    }
    .signature {
      margin-top: 60px;
      display: flex;
      justify-content: space-around;
    }
    .signature-line {
      border-top: 2px solid #2c3e50;
      width: 200px;
      margin-top: 60px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <h1>Certificate of Completion</h1>
    <p class="subtitle">This is to certify that</p>
    <div class="name">${userName}</div>
    <p class="subtitle">has successfully completed</p>
    <p class="course">${courseTitle}</p>
    <p class="date">on ${completedDate}</p>
    <div class="signature">
      <div>
        <div class="signature-line"></div>
        <p>Instructor</p>
      </div>
      <div>
        <div class="signature-line"></div>
        <p>Date</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

