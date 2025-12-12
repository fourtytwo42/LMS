import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

const protectedRoutes = ["/dashboard", "/courses", "/users", "/analytics"];
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("accessToken")?.value;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If accessing protected route without token, redirect to login
  // But first check if token exists but wasn't read correctly
  if (isProtectedRoute && !token) {
    // Debug: log all cookies to see what's available
    const allCookies = request.cookies.getAll();
    console.log("❌ Middleware - No accessToken found for protected route:", pathname);
    console.log("   All cookies:", allCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
    
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Log successful token check
  if (isProtectedRoute && token) {
    console.log("✅ Middleware - accessToken found for:", pathname);
  }

  // If accessing auth route with valid token, redirect to dashboard
  if (isAuthRoute && token) {
    try {
      verifyToken(token);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch {
      // Token invalid, allow access to auth route
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

