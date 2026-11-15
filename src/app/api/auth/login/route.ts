import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getDefaultRouteForRole,
} from "@/lib/auth";
import { verifyUserCredentials } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
    };

    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Kullanıcı adı ve şifre gereklidir." },
        { status: 400 }
      );
    }

    const { user, dbMode } = await verifyUserCredentials(username, password);
    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı adı veya şifre hatalı." },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);
    const redirectTo = getDefaultRouteForRole(user.role);

    const response = NextResponse.json({
      user,
      redirectTo,
      dbMode,
    });

    const isHttps =
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https";

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: isHttps,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Giriş işlemi sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
