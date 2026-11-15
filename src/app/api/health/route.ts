import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { dbMode, notice } = await ensureDbInitialized();
    return NextResponse.json(
      {
        status: "ok",
        dbMode,
        notice: notice ?? null,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/health error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: "Sağlık kontrolü başarısız oldu.",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
