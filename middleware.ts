// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /protected-route)
  const path = request.nextUrl.pathname;

  const token = request.cookies.get("token")?.value || "";

  // Define public routes that don't require authentication
  const publicPaths = ["/login", "/register"];
  const isPublicPath = publicPaths.includes(path);

  // Redirect authenticated users away from auth pages
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login page
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Allow the request to continue
  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: ["/dashboard", "/login", "/register"],
};