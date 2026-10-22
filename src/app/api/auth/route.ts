import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getExpectedAuthToken,
  getMasterPin,
  isValidAuthToken,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = isValidAuthToken(token);
  return NextResponse.json({
    success: true,
    authenticated,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const submittedPin = String(body.pin || "").trim();
    const masterPin = getMasterPin();

    if (!submittedPin || submittedPin !== masterPin) {
      return NextResponse.json(
        {
          success: false,
          error: "Mã PIN bảo mật không chính xác! Vui lòng thử lại.",
        },
        { status: 401 }
      );
    }

    const token = getExpectedAuthToken();
    const res = NextResponse.json({
      success: true,
      authenticated: true,
      message: "Đã mở khóa TE Brain AI thành công!",
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Lỗi xác thực mã PIN." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({
    success: true,
    authenticated: false,
    message: "Đã khóa màn hình bảo mật.",
  });

  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}
