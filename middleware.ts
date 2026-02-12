import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Protect dashboard routes
  if (url.pathname.startsWith("/dashboard")) {
    const token = url.searchParams.get("token");

    // If no token, send user to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      // Verify the token using your secret
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      // Invalid or expired token → redirect
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}
