import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getMasterPin,
  isValidAuthToken,
} from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow /api/auth publicly so user can verify PIN and check session
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.json({ error: "Pass" }, { status: 200 }).headers
      ? NextResponse.next()
      : NextResponse.next();
  }

  // Protect all other /api/* routes
  if (pathname.startsWith("/api/")) {
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const headerPin = req.headers.get("x-te-pin");

    if (
      isValidAuthToken(cookieToken) ||
      (headerPin && headerPin.trim() === getMasterPin())
    ) {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        success: false,
        unauthorized: true,
        error: "Vui lòng nhập Mã PIN 6 số để mở khóa hệ thống.",
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
