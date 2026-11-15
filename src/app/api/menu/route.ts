import { NextResponse } from "next/server";
import { getMenuItems } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getMenuItems();
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/menu error:", error);
    return NextResponse.json(
      { error: "Menü yüklenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
