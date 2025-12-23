import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // This middleware is a placeholder for future server-side authentication
  // Currently, authentication is handled client-side in the dashboard
  // 
  // In production, you would:
  // 1. Get the token from cookies/headers
  // 2. Verify the JWT token
  // 3. Redirect to login if invalid
  // 
  // Example implementation:
  // const token = request.cookies.get("auth-token")?.value
  // if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
  //   return NextResponse.redirect(new URL("/login", request.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
}

