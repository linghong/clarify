// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Clear the cookie
  const cookieStore = await cookies();
  cookieStore.set({
    name: "token",
    value: "",
    expires: new Date(0),
    path: "/",
  });

  return NextResponse.json({ message: "Logged out successfully" });
}