import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";

export async function POST(request: NextRequest) {
  try {
    await authenticate(request);

    const response = NextResponse.json(
      { message: "Logout successful" },
      { status: 200 }
    );

    // Clear cookies
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (error) {
    // Even if not authenticated, clear cookies
    const response = NextResponse.json(
      { message: "Logout successful" },
      { status: 200 }
    );

    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  }
}

