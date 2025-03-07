// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value || "";

  // Define public routes that don't require authentication
  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicPath = publicPaths.includes(path) || path.startsWith('/reset-password');

  // Define protected routes that require authentication
  const protectedPaths = ["/dashboard", "/profile", "/courses"];
  const isProtectedPath = protectedPaths.includes(path) || path.startsWith('/courses');

  // Redirect authenticated users away from auth pages
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login page
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/profile",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/courses",
    "/courses/:path*"  // This will match all routes under /courses
  ],
};