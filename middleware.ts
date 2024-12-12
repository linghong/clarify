// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value || "";

  // Define public routes that don't require authentication
  const publicPaths = ["/login", "/register"];
  const isPublicPath = publicPaths.includes(path);

  // Define protected routes that require authentication
  const protectedPaths = ["/dashboard", "/profile"];
  const isProtectedPath = protectedPaths.includes(path);

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

// Update the matcher to include the profile page
export const config = {
  matcher: ["/dashboard", "/profile", "/login", "/register"],
};